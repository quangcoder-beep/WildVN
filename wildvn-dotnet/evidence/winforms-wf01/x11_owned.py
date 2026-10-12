import ctypes as C
import os, pathlib, re, subprocess

def gui_environment():
    env = os.environ.copy()
    for line in subprocess.check_output(['ps', '-eo', 'pid,uid,comm'], text=True).splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[1] == str(os.getuid()) and parts[2] == 'gnome-shell':
            for item in pathlib.Path('/proc/' + parts[0] + '/environ').read_bytes().split(b'\0'):
                key, _, value = item.partition(b'=')
                if key.decode() in ('DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR'):
                    env[key.decode()] = value.decode()
    return env

class Button(C.Structure):
    _fields_ = [('type', C.c_int), ('serial', C.c_ulong), ('send_event', C.c_int), ('display', C.c_void_p), ('window', C.c_ulong), ('root', C.c_ulong), ('subwindow', C.c_ulong), ('time', C.c_ulong), ('x', C.c_int), ('y', C.c_int), ('x_root', C.c_int), ('y_root', C.c_int), ('state', C.c_uint), ('button', C.c_uint), ('same_screen', C.c_int)]
class Data(C.Union):
    _fields_ = [('b', C.c_char * 20), ('s', C.c_short * 10), ('l', C.c_long * 5)]
class Message(C.Structure):
    _fields_ = [('type', C.c_int), ('serial', C.c_ulong), ('send_event', C.c_int), ('display', C.c_void_p), ('window', C.c_ulong), ('message_type', C.c_ulong), ('format', C.c_int), ('data', Data)]
class Event(C.Union):
    _fields_ = [('button', Button), ('message', Message), ('pad', C.c_long * 24)]

class OwnWindow:
    def __init__(self, window, env):
        self.window = window
        self.env = env
        os.environ['DISPLAY'] = env['DISPLAY']
        os.environ['XAUTHORITY'] = env['XAUTHORITY']
        self.lib = C.CDLL('libX11.so.6')
        self.lib.XOpenDisplay.argtypes = [C.c_char_p]; self.lib.XOpenDisplay.restype = C.c_void_p
        self.lib.XSendEvent.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_long, C.POINTER(Event)]
        self.lib.XInternAtom.argtypes = [C.c_void_p, C.c_char_p, C.c_int]; self.lib.XInternAtom.restype = C.c_ulong
        self.lib.XFlush.argtypes = [C.c_void_p]
        self.display = self.lib.XOpenDisplay(env['DISPLAY'].encode())
        if not self.display: raise RuntimeError('Cannot connect X11')
    def tree(self):
        return subprocess.check_output(['xwininfo', '-id', hex(self.window), '-tree'], env=self.env, text=True)
    def click(self, title):
        # All target IDs must belong to the subtree of the window this run owns.
        tree = self.tree()
        match = re.search(r'(0x[0-9a-f]+) "' + re.escape(title) + r'"[^\n]*\n\s+1 child:\n\s+(0x[0-9a-f]+)', tree)
        if not match: raise RuntimeError('Own button not found: ' + title)
        button = int(match.group(2), 16)
        for kind, mask in [(4, 1 << 2), (5, 1 << 3)]:
            event = Event()
            event.button = Button(type=kind, display=self.display, window=button, root=0, x=20, y=15, button=1, same_screen=1)
            if not self.lib.XSendEvent(self.display, button, 0, mask, C.byref(event)): raise RuntimeError('XSendEvent failed')
        self.lib.XFlush(self.display)
    def close(self):
        event = Event()
        event.message = Message(type=33, display=self.display, window=self.window,
            message_type=self.lib.XInternAtom(self.display, b'WM_PROTOCOLS', 0), format=32)
        event.message.data.l[0] = self.lib.XInternAtom(self.display, b'WM_DELETE_WINDOW', 0)
        self.lib.XSendEvent(self.display, self.window, 0, 0, C.byref(event)); self.lib.XFlush(self.display)

    def activate(self):
        self.lib.XDefaultRootWindow.argtypes = [C.c_void_p]
        self.lib.XDefaultRootWindow.restype = C.c_ulong
        event = Event()
        event.message = Message(type=33, display=self.display, window=self.window, message_type=self.lib.XInternAtom(self.display, b'_NET_ACTIVE_WINDOW', 0), format=32)
        event.message.data.l[0] = 1
        self.lib.XSendEvent(self.display, self.lib.XDefaultRootWindow(self.display), 0, (1 << 19) | (1 << 20), C.byref(event))
        self.lib.XFlush(self.display)

    def capture(self, filename):
        from PIL import Image
        class XImage(C.Structure):
            _fields_ = [('width', C.c_int), ('height', C.c_int), ('xoffset', C.c_int), ('format', C.c_int), ('data', C.c_void_p), ('byte_order', C.c_int), ('bitmap_unit', C.c_int), ('bitmap_bit_order', C.c_int), ('bitmap_pad', C.c_int), ('depth', C.c_int), ('bytes_per_line', C.c_int), ('bits_per_pixel', C.c_int), ('red_mask', C.c_ulong), ('green_mask', C.c_ulong), ('blue_mask', C.c_ulong)]
        info = subprocess.check_output(['xwininfo', '-id', hex(self.window)], env=self.env, text=True)
        width = int(re.search(r'Width: (\d+)', info).group(1)); height = int(re.search(r'Height: (\d+)', info).group(1))
        self.lib.XGetImage.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_int, C.c_uint, C.c_uint, C.c_ulong, C.c_int]
        self.lib.XGetImage.restype = C.POINTER(XImage)
        self.lib.XDestroyImage.argtypes = [C.POINTER(XImage)]
        img = self.lib.XGetImage(self.display, self.window, 0, 0, width, height, C.c_ulong(-1), 2)
        if not img: raise RuntimeError('XGetImage failed')
        try:
            assert img.contents.bits_per_pixel == 32 and img.contents.byte_order == 0
            raw = C.string_at(img.contents.data, img.contents.bytes_per_line * height)
            Image.frombytes('RGB', (width, height), raw, 'raw', 'BGRX', img.contents.bytes_per_line, 1).save(filename)
        finally: self.lib.XDestroyImage(img)
