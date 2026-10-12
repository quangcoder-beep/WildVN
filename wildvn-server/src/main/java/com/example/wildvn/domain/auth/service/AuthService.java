package com.example.wildvn.domain.auth.service;

import com.example.wildvn.domain.auth.dto.AuthResponse;
import com.example.wildvn.domain.auth.dto.LoginRequest;
import com.example.wildvn.domain.auth.dto.RegisterRequest;
import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.entity.UserProfile;
import com.example.wildvn.domain.user.entity.UserRole;
import com.example.wildvn.domain.user.repository.UserRepository;
import com.example.wildvn.security.JwtUtil;
import com.example.wildvn.security.LoginRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    // Rate limiter để chống brute-force tấn công endpoint đăng nhập
    private final LoginRateLimiter loginRateLimiter;

    public AuthResponse login(LoginRequest request) {
        // ── Kiểm tra giới hạn đăng nhập trước khi xử lý ────────────────────
        // Nếu username đã thử quá 5 lần trong 1 phút → ném LoginRateLimitException (429)
        loginRateLimiter.checkLoginAllowed(request.getUsername());
        User user = userRepository.findByUsernameAndDeletedAtIsNull(request.getUsername())
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Tên đăng nhập hoặc mật khẩu không đúng"));
                
        if (user.getAuthProvider() != com.example.wildvn.domain.user.entity.AuthProvider.LOCAL) {
            throw new org.springframework.security.authentication.BadCredentialsException("Tài khoản này được đăng ký qua " + user.getAuthProvider() + ". Vui lòng sử dụng tính năng đăng nhập bằng mạng xã hội.");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        String jwt = jwtUtil.generateToken(userDetails);
        
        UserProfile profile = user.getProfile();

        return AuthResponse.builder()
                .accessToken(jwt)
                .refreshToken("mock-refresh-token-for-now")
                .user(AuthResponse.UserProfileDto.builder()
                        .id(user.getId().toString())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .avatarUrl(profile != null ? profile.getAvatarUrl() : null)
                        .bio(profile != null ? profile.getBio() : null)
                        .conservationIdentity(profile != null ? profile.getConservationIdentity() : null)
                        .headphonePreference(profile != null ? profile.getHeadphonePreference() : false)
                        .build())
                .build();
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsernameAndDeletedAtIsNull(request.getUsername())) {
            throw new IllegalStateException("Tên người dùng đã tồn tại");
        }
        if (userRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
            throw new IllegalStateException("Email đã được sử dụng");
        }

        User newUser = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.USER)
                .build();

        UserProfile profile = UserProfile.builder()
                .user(newUser)
                .headphonePreference(false)
                .build();
        
        newUser.setProfile(profile);

        userRepository.save(newUser);

        UserDetails userDetails = userDetailsService.loadUserByUsername(newUser.getUsername());
        String jwt = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .accessToken(jwt)
                .refreshToken("mock-refresh-token-for-now")
                .user(AuthResponse.UserProfileDto.builder()
                        .id(newUser.getId().toString())
                        .username(newUser.getUsername())
                        .email(newUser.getEmail())
                        .headphonePreference(false)
                        .build())
                .build();
    }

    public AuthResponse getMe(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username)
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Người dùng không tồn tại"));

        UserProfile profile = user.getProfile();

        return AuthResponse.builder()
                .user(AuthResponse.UserProfileDto.builder()
                        .id(user.getId().toString())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .avatarUrl(profile != null ? profile.getAvatarUrl() : null)
                        .bio(profile != null ? profile.getBio() : null)
                        .conservationIdentity(profile != null ? profile.getConservationIdentity() : null)
                        .headphonePreference(profile != null ? profile.getHeadphonePreference() : false)
                        .build())
                .build();
    }
}
