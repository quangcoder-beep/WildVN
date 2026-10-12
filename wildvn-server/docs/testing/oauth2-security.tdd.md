# OAuth2 endpoint security TDD evidence

## User journey

As an unauthenticated visitor, I want to start Google or Facebook OAuth login,
so that the browser is redirected to the provider instead of receiving the JSON 401 response.

## Test evidence

| # | Guarantee | Test | Result |
|---|---|---|---|
| 1 | The OAuth2 authorization start path is not intercepted by the JSON authentication entry point. | `OAuth2AuthorizationSecurityTest.authorizationStartEndpointIsNotRejectedByJsonAuthenticationEntryPoint` | PASS |
| 2 | The OAuth2 callback path is not intercepted by the JSON authentication entry point. | `OAuth2AuthorizationSecurityTest.authorizationCallbackEndpointIsNotRejectedByJsonAuthenticationEntryPoint` | PASS |
| 3 | Existing Spring Boot tests remain green after the matcher change. | `env GRADLE_USER_HOME=/tmp/wildvn-gradle ./gradlew --no-daemon test --console=plain` | PASS |

## RED/GREEN checkpoints

- RED: `9323768 test: add OAuth2 public endpoint regression` failed with both requests returning 401.
- GREEN: `e1fc944 fix: allow OAuth2 authorization flow endpoints` and `de09feb fix: scope OAuth2 public matchers` added `permitAll` for `/oauth2/authorization/**` and `/login/oauth2/code/**`; the focused test and full test suite passed.

## Runtime requirement

The Spring OAuth2 client registrations and provider credentials still need to be present in the backend runtime environment. With those registrations enabled, the permitted authorization path is handled by Spring's OAuth2 redirect filter and the callback is handled by the OAuth2 login filter.
