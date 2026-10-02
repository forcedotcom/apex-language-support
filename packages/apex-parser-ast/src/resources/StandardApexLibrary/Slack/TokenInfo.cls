global class TokenInfo {
    global Object TokenInfo() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Set getTokenScopes() { return null; }

    global Slack.TokenType getTokenType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setTokenScopes(Set tokenScopes) { }

    global void setTokenType(Slack.TokenType tokenType) { }

    global override virtual String toString() { return null; }
}