# Bromate REST API Firewall

📖 **[Documentation](https://wal.abc-plugins.com)**

Bromate REST API Firewall sits between WordPress and your client applications.

| Feature | Description |
|---|---|
| **Authentication** | JWT and WordPress Users Application Passwords |
| **Rate Limiting** | Configurable request quotas with auto-blacklist on violations |
| **Login Hardening** | Login form protection: rate limiting |
| **IP Filtering** | IPv4/IPv6 blacklisting, CIDR ranges, country-level blocking (GeoIP) |
| **Routes Control** | Enforce authentication, disable sensitive routes, per-route authenticated users |
| **Response Transforms** | resolve embedded data, flatten rendered fields, strip domain from URLs |
| **WordPress Security** | Disable XML-RPC, comments, pingbacks, RSS; enforce security headers; secure file permissions |
| **Application Only Mode** | Enforces headless-only access |


## Requirements

- WordPress 6.0+
- PHP 7.4+

## Install in 4 Steps

### 1. Download or clone this repository into your `wp-content/plugins/` directory

```bash
cd wp-content/plugins/
git clone https://github.com/AfterglowWeb/wordpress-rest-api-firewall.git bromate-rest-api-firewall
```

### 2. Activate the plugin through the WordPress admin

Navigate to the **Bromate REST API Firewall** admin page.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

GPL-2.0-or-later

