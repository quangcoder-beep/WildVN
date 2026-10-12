import base64
import hashlib
import pathlib
import re
import unittest
import subprocess
import json

HTML = pathlib.Path(__file__).resolve().parents[1] / "src/WildVN.Desktop/Media/Assets/media-poc.html"


class MediaAssetTests(unittest.TestCase):
    def test_local_document_has_locked_csp_with_matching_inline_hashes(self):
        text = HTML.read_text()
        self.assertIn("default-src 'none'", text)
        self.assertIn("connect-src 'none'", text)
        self.assertIn("frame-src 'none'", text)
        for tag in ["script", "style"]:
            blocks = re.findall(rf"<{tag}>(.*?)</{tag}>", text, re.S)
            self.assertEqual(1, len(blocks))
            digest = base64.b64encode(hashlib.sha256(blocks[0].encode()).digest()).decode()
            self.assertIn("'sha256-" + digest + "'", text)
        self.assertNotRegex(text, r"<(?:script|link|iframe)[^>]+(?:src|href)=")
        self.assertNotIn("https://", text)
        self.assertNotIn("http://", text)

    def test_playback_and_cleanup_do_not_need_a_javascript_bridge(self):
        text = HTML.read_text()
        for function in ["play", "pause", "stop", "mute", "setReducedMotion", "loadSamples"]:
            self.assertIn(function, text)
        self.assertIn("pagehide", text)
        self.assertIn("visibilitychange", text)
        self.assertIn("requestVideoFrameCallback", text)
        self.assertIn("getVideoPlaybackQuality", text)
        self.assertIn("prefers-reduced-motion", text)
        self.assertIn("muted", text)
        self.assertNotIn("postMessage", text)
        self.assertNotIn("chrome.webview", text)
        self.assertNotIn("fetch(", text)


    def test_real_script_controls_only_selected_media_and_cleans_up(self):
        script = re.search(r"<script>(.*?)</script>", HTML.read_text(), re.S)[1]
        harness = r"""
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Element {
  constructor() { this.attrs={}; this.muted=false; this.paused=true; this.readyState=1; this.currentTime=8; this.loads=0; }
  setAttribute(k,v) {this.attrs[k]=v;}
  getAttribute(k) {return this.attrs[k];}
  removeAttribute(k) {delete this.attrs[k];}
  addEventListener() {}
  play() {this.paused=false;return Promise.resolve();}
  pause() {this.paused=true;}
  load() {this.loads++;}
  getVideoPlaybackQuality() {return {totalVideoFrames:5,droppedVideoFrames:1};}
}
const nodes=Object.fromEntries(['image','video','audio','status','play','pause','stop'].map(n=>[n,new Element()]));
const listeners={}, window={}, hero={motion:false,classList:{toggle(_,value){hero.motion=value;}}};
const document={hidden:false,getElementById:n=>nodes[n],querySelector:()=>hero,addEventListener:(n,f)=>listeners[n]=f};
window.addEventListener=(n,f)=>listeners[n]=f;
vm.runInNewContext(SOURCE,{window,document});
window.mediaPoc.loadSamples({image:'image.webp\n'});
assert.equal(nodes.image.getAttribute('src'),undefined);
window.mediaPoc.loadSamples({image:'image.webp',video:'video.mp4',audio:'../private.json'});
assert.equal(nodes.video.getAttribute('src'),'video.mp4');
assert.equal(nodes.audio.getAttribute('src'),undefined);
assert.equal(nodes.video.muted,true);
assert.equal(hero.motion,false);
window.mediaPoc.play();assert.equal(nodes.video.paused,false);
window.mediaPoc.pause();assert.equal(nodes.video.paused,true);
window.mediaPoc.mute(false);assert.equal(nodes.video.muted,false);
window.mediaPoc.setReducedMotion(false);assert.equal(hero.motion,true);
window.mediaPoc.stop();assert.equal(nodes.video.currentTime,0);
window.mediaPoc.play();document.hidden=true;listeners.visibilitychange();assert.equal(nodes.video.paused,true);
assert.equal(window.mediaPoc.metrics().droppedVideoFrames,1);
listeners.pagehide();assert.equal(nodes.video.getAttribute('src'),undefined);assert.equal(nodes.video.loads,1);
console.log('Script DOM-stub unit: controls, allowlist, motion, metrics and cleanup PASS; no browser/codecs measured');
"""
        result = subprocess.run(["node", "--input-type=module", "-e", "const SOURCE=" + json.dumps(script) + ";" + harness], capture_output=True, text=True)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("cleanup PASS", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
