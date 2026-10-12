package com.example.wildvn.security;

import com.example.wildvn.security.oauth2.CustomOAuth2UserService;
import com.example.wildvn.security.oauth2.CustomOidcUserService;
import com.example.wildvn.security.oauth2.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomOidcUserService customOidcUserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    @Value("${wildvn.security.csrf-enabled:true}")
    private boolean csrfEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository
    ) throws Exception {
        http
                // ── CORS ────────────────────────────────────────────────────────────
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── Exception Handlers ────────────────────────────────────────────
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(customAuthenticationEntryPoint) // 401 → JSON
                        .accessDeniedHandler(customAccessDeniedHandler)            // 403 → JSON
                )

                // ── Authorization ─────────────────────────────────────────────────
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/search", "/api/search/**",
                                "/api/recommend/**",
                                "/api/chat", "/api/chat/stream",
                                "/api/species", "/api/species/**",
                                "/api/ecosystems", "/api/ecosystems/**",
                                "/api/academy/overview",
                                // OAuth2 entry and callback endpoints must remain public;
                                // otherwise the JSON entry point intercepts the browser redirect.
                                "/oauth2/authorization/**", "/login/oauth2/code/**",
                                "/error"
                        ).permitAll()
                        .requestMatchers("/api/chat/sessions/**").authenticated()
                        .requestMatchers("/api/academy", "/api/academy/**").authenticated()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )

                // ── Stateless Session ─────────────────────────────────────────────
                // JWT trong Cookie thay cho server session — Spring không tạo session
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // ── JWT Filter ────────────────────────────────────────────────────
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                ;

        if (csrfEnabled) {
            http.csrf(csrf -> csrf
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                    .ignoringRequestMatchers("/api/auth/**"));
        } else {
            http.csrf(csrf -> csrf.disable());
        }

        if (clientRegistrationRepository.getIfAvailable() != null) {
            http.oauth2Login(oauth2 -> oauth2
                    .userInfoEndpoint(userInfo -> userInfo
                            .userService(customOAuth2UserService)
                            .oidcUserService(customOidcUserService)
                    )
                    .successHandler(oAuth2AuthenticationSuccessHandler)
            );
        }

        return http.build();
    }

    /**
     * CORS Configuration.
     *
     * allowCredentials(true) BẮT BUỘC phải bật khi dùng Cookie cross-origin.
     * Đồng thời KHÔNG được dùng allowedOrigins("*") khi credentials = true.
     * Phải liệt kê rõ từng origin.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ⚠️  PRODUCTION: thay bằng domain thật (vd: "https://wildvn.vn")
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://localhost:3001"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        // BẮT BUỘC = true để browser gửi Cookie cùng request cross-origin
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
