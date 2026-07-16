def parse_user_agent(user_agent_str):
    """
    Parses user agent to extract browser and OS details.
    """
    if not user_agent_str:
        return "Unknown", "Unknown"

    ua = user_agent_str.lower()

    # Simple OS detection
    if "windows" in ua:
        os_name = "Windows"
    elif "macintosh" in ua or "mac os x" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    else:
        os_name = "Unknown OS"

    # Simple Browser detection
    if "chrome" in ua or "chromium" in ua:
        if "edg" in ua:
            browser_name = "Edge"
        elif "opr" in ua or "opera" in ua:
            browser_name = "Opera"
        else:
            browser_name = "Chrome"
    elif "safari" in ua:
        browser_name = "Safari"
    elif "firefox" in ua:
        browser_name = "Firefox"
    elif "msie" in ua or "trident" in ua:
        browser_name = "Internet Explorer"
    else:
        browser_name = "Unknown Browser"

    return browser_name, os_name


def get_client_ip(request):
    """
    Extracts the client's public IP address safely from headers.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_client_city(request):
    """
    Extracts the client's city from standard proxy geo headers (Render, CF).
    """
    city = request.headers.get("CF-IPCity") or request.META.get("HTTP_CF_IPCITY")
    if not city:
        city = request.headers.get("X-AppEngine-City") or request.META.get(
            "HTTP_X_APPENGINE_CITY"
        )
    if not city:
        city = request.headers.get("X-Render-Geo-City") or request.META.get(
            "HTTP_X_RENDER_GEO_CITY"
        )
    return city or "Unknown"
