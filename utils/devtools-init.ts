try {
    chrome.devtools.panels.create(
        "Web Helper",
        "icon/32.png",
        "tools.html"
    );
} catch (e) {
    console.error("Failed to create panel:", e);
}
