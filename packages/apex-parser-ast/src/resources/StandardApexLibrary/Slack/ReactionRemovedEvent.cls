global class ReactionRemovedEvent extends Slack.Event {
    global ReactionRemovedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global Slack.ReactionRemovedEvent.Item getItem() { return null; }

    global String getItemUser() { return null; }

    global String getReaction() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setItem(Slack.ReactionRemovedEvent.Item item) { }

    global void setItemUser(String itemUser) { }

    global void setReaction(String reaction) { }

    global void setUser(String user) { }

    global override String toString() { return null; }

    global class Item {
        global Item() { }

        global Slack.ReactionRemovedEvent.Item clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannel() { return null; }

        global String getFile() { return null; }

        global String getFileComment() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannel(String channel) { }

        global void setFile(String file) { }

        global void setFileComment(String fileComment) { }

        global void setTs(String ts) { }

        global void setType(String type) { }

        global override virtual String toString() { return null; }
    }
}