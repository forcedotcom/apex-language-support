global class TokensRevokedEvent extends Slack.Event {
    global Object TokensRevokedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual String getSubtype() { return null; }

    global Slack.TokensRevokedEvent.Tokens getTokens() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setTokens(Slack.TokensRevokedEvent.Tokens tokens) { }

    global override String toString() { return null; }

    global class Tokens {
        global Object Tokens() { return null; }

        global Slack.TokensRevokedEvent.Tokens clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getBot() { return null; }

        global List getOauth() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setBot(List bot) { }

        global void setOauth(List oauth) { }

        global override virtual String toString() { return null; }
    }
}