global class EinsteinBots {
    global EinsteinBots() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global String sendMessageToBot(String botId, String botVersionId, String prompt) { return null; }

    global override virtual String toString() { return null; }
}