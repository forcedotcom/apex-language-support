global class VisualforcePage extends QuickAction.DescribeLayoutComponent {
    global Boolean showlabel { get; }
    global Boolean showscrollbars { get; }
    global String suggestedheight { get; }
    global String suggestedwidth { get; }
    global String url { get; }

    global Boolean equals(Object obj) { return false; }

    global Integer getDisplayLines() { return 0; }

    global Boolean getShowLabel() { return false; }

    global Boolean getShowScrollbars() { return false; }

    global String getSuggestedHeight() { return null; }

    global String getSuggestedWidth() { return null; }

    global Integer getTabOrder() { return 0; }

    global String getType() { return null; }

    global String getUrl() { return null; }

    global String getValue() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}