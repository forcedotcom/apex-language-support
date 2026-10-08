global class DndUpdatedUserEvent extends Slack.Event {
    global DndUpdatedUserEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.DndUpdatedUserEvent.DndStatus getDndStatus() { return null; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setDndStatus(Slack.DndUpdatedUserEvent.DndStatus dndStatus) { }

    global void setEventTs(String eventTs) { }

    global void setUser(String user) { }

    global override String toString() { return null; }

    global class DndStatus {
        global DndStatus() { }

        global Slack.DndUpdatedUserEvent.DndStatus clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Integer getNextDndEndTs() { return 0; }

        global Integer getNextDndStartTs() { return 0; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isDndEnabled() { return false; }

        global void setDndEnabled(Boolean dndEnabled) { }

        global void setNextDndEndTs(Integer nextDndEndTs) { }

        global void setNextDndStartTs(Integer nextDndStartTs) { }

        global override virtual String toString() { return null; }
    }
}