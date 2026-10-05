global class SlashCommandParameters {
    global SlashCommandParameters(String command, String text) { }

    global virtual Boolean equals(Object o) { return false; }

    global String getCommand() { return null; }

    global String getText() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}