<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php esc_html_e( 'Two-Factor Authentication', 'bromate-rest-api-firewall' ); ?></title>
    <?php wp_head(); ?>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #f0f0f1;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            font-size: 13px;
        }
        .login-container {
            background: #ffffff;
            padding: 32px 28px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            max-width: 380px;
            width: 100%;
            margin: 20px;
        }
        .login-container h1 {
            font-size: 22px;
            margin: 0 0 8px 0;
            font-weight: 400;
            color: #1d2327;
        }
        .login-container .subtitle {
            color: #646970;
            margin: 0 0 24px 0;
            font-size: 13px;
            line-height: 1.5;
        }
        .login-container .username {
            font-weight: 600;
            color: #1d2327;
        }
        .login-container .field-group {
            margin-bottom: 16px;
        }
        .login-container label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            color: #1d2327;
            font-size: 13px;
        }
        .login-container input[type="text"] {
            width: 100%;
            padding: 8px 12px;
            font-size: 20px;
            text-align: center;
            letter-spacing: 8px;
            border: 1px solid #dcdcde;
            background: #ffffff;
            font-family: monospace;
            transition: border-color 0.15s;
            color: #1d2327;
        }
        .login-container input[type="text"]:focus {
            border-color: #3858e9;
            box-shadow: 0 0 0 1px #3858e9;
            outline: none;
        }
        .login-container .remember-device {
            margin: 12px 0 20px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .login-container .remember-device input[type="checkbox"] {
            margin: 0;
            width: 16px;
            height: 16px;
            border: 1px solid #dcdcde;
            background: #ffffff;
            accent-color: #3858e9;
            cursor: pointer;
        }
        .login-container .remember-device label {
            margin: 0;
            font-weight: 400;
            color: #646970;
            font-size: 13px;
            cursor: pointer;
        }
        .login-container .submit-button {
            background: #3858e9;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
            transition: background 0.15s;
            font-weight: 500;
            text-transform: none;
            border-radius: 0;
            box-shadow: none;
        }
        .login-container .submit-button:hover {
            background: #183ad6;
        }
        .login-container .submit-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .login-container .error-message {
            background: #fcf0f1;
            border-left: 3px solid #cc1818;
            padding: 10px 12px;
            margin-bottom: 16px;
            color: #cc1818;
            font-size: 13px;
            display: none;
        }
        .login-container .back-link {
            display: block;
            text-align: center;
            margin-top: 16px;
            color: #3858e9;
            text-decoration: none;
            font-size: 13px;
        }
        .login-container .back-link:hover {
            color: #183ad6;
            text-decoration: underline;
        }
        .login-container .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3858e9;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            vertical-align: middle;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .login-container .verify-success {
            display: none;
            text-align: center;
            padding: 10px;
            color: #00a32a;
            font-weight: 500;
        }
        #login-footer {
            margin-top: 20px;
            text-align: center;
            color: #646970;
            font-size: 12px;
        }
        #login-footer a {
            color: #3858e9;
            text-decoration: none;
        }
        #login-footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1><?php esc_html_e( 'Two-Factor Authentication', 'bromate-rest-api-firewall' ); ?></h1>
        <p class="subtitle">
            <?php esc_html_e( 'Enter the verification code from your authenticator app.', 'bromate-rest-api-firewall' ); ?>
            <br>
            <span class="username"><?php echo esc_html( $username ); ?></span>
        </p>

        <div id="error-message" class="error-message"></div>
        <div id="verify-success" class="verify-success">
            <?php esc_html_e( '✓ Verification successful. Redirecting...', 'bromate-rest-api-firewall' ); ?>
        </div>

        <form method="post" id="totp-form">
            <?php wp_nonce_field( 'bromate_totp_login_verify', 'bromate_totp_nonce' ); ?>
            <input type="hidden" name="bromate_totp_session" value="<?php echo esc_attr( $session_id ); ?>">

            <div class="field-group">
                <label for="bromate-totp-code"><?php esc_html_e( 'Authentication Code', 'bromate-rest-api-firewall' ); ?></label>
                <input
                    type="text"
                    name="bromate_totp_code"
                    id="bromate-totp-code"
                    placeholder="<?php esc_attr_e( '6-digit code', 'bromate-rest-api-firewall' ); ?>"
                    maxlength="6"
                    pattern="[0-9]{6}"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    autofocus
                    required
                >
            </div>

            <div class="remember-device">
                <input type="checkbox" name="bromate_totp_remember" id="remember-device" value="1">
                <label for="remember-device"><?php esc_html_e( 'Remember this device for 30 days', 'bromate-rest-api-firewall' ); ?></label>
            </div>

            <button type="submit" class="submit-button" id="submit-button">
                <?php esc_html_e( 'Verify', 'bromate-rest-api-firewall' ); ?>
            </button>
        </form>

        <a href="<?php echo esc_url( wp_login_url() ); ?>" class="back-link">
            <?php esc_html_e( '← Back to login', 'bromate-rest-api-firewall' ); ?>
        </a>

        <div id="login-footer">
            <?php echo sprintf(
                __( 'Powered by %s', 'bromate-rest-api-firewall' ),
                '<a href="https://bromate.com" target="_blank">Bromate</a>'
            ); ?>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('totp-form');
        const codeInput = document.getElementById('bromate-totp-code');
        const submitButton = document.getElementById('submit-button');
        const errorMessage = document.getElementById('error-message');
        const verifySuccess = document.getElementById('verify-success');

        // Dedicated submission function
        function submitVerification() {
            const code = codeInput.value.trim();
            if (code.length !== 6) {
                errorMessage.textContent = '<?php esc_html_e( 'Please enter a valid 6-digit code.', 'bromate-rest-api-firewall' ); ?>';
                errorMessage.style.display = 'block';
                return;
            }

            errorMessage.style.display = 'none';
            verifySuccess.style.display = 'none';

            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner"></span> <?php esc_html_e( 'Verifying...', 'bromate-rest-api-firewall' ); ?>';

            const formData = new FormData();
            formData.append('action', 'bromate_verify_login_totp');
            formData.append('code', code);
            formData.append('session_id', '<?php echo esc_js( $session_id ); ?>');
            formData.append('remember_device', document.getElementById('remember-device').checked ? '1' : '0');
            formData.append('nonce', '<?php echo esc_js( wp_create_nonce( 'bromate_totp_login_verify' ) ); ?>');

            fetch('<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    verifySuccess.style.display = 'block';
                    submitButton.innerHTML = '<?php esc_html_e( '✓ Verified', 'bromate-rest-api-firewall' ); ?>';
                    
                    // Clear the verification session cookie
                    document.cookie = 'bromate_totp_verification_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
                    
                    setTimeout(function() {
                        window.location.href = data.data.redirect_url || '<?php echo esc_js( admin_url() ); ?>';
                    }, 800);
                } else {
                    errorMessage.textContent = data.data.message || '<?php esc_html_e( 'Verification failed. Please try again.', 'bromate-rest-api-firewall' ); ?>';
                    errorMessage.style.display = 'block';
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<?php esc_html_e( 'Verify', 'bromate-rest-api-firewall' ); ?>';
                    
                    if (data.data.locked) {
                        submitButton.disabled = true;
                        submitButton.innerHTML = '<?php esc_html_e( 'Locked', 'bromate-rest-api-firewall' ); ?>';
                    }
                    
                    codeInput.value = '';
                    codeInput.focus();
                }
            })
            .catch(() => {
                errorMessage.textContent = '<?php esc_html_e( 'An error occurred. Please try again.', 'bromate-rest-api-firewall' ); ?>';
                errorMessage.style.display = 'block';
                submitButton.disabled = false;
                submitButton.innerHTML = '<?php esc_html_e( 'Verify', 'bromate-rest-api-firewall' ); ?>';
            });
        }

        // Auto-submit when 6 digits are entered - calls the same function
        codeInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
            if (this.value.length === 6) {
                // Call the dedicated function instead of form.submit()
                submitVerification();
            }
        });

        // Form submit listener - calls the same function
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            submitVerification();
        });
    });
    </script>

    <?php wp_footer(); ?>
</body>
</html>