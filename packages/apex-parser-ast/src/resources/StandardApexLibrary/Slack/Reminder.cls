global class Reminder {
    global Reminder() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global Integer getCompleteTs() { return 0; }

    global String getCreator() { return null; }

    global String getId() { return null; }

    global Object getItem() { return null; }

    global Slack.Reminder.Recurrence getRecurrence() { return null; }

    global String getText() { return null; }

    global Integer getTime() { return 0; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isRecurring() { return false; }

    global void setChannel(String channel) { }

    global void setCompleteTs(Integer completeTs) { }

    global void setCreator(String creator) { }

    global void setId(String id) { }

    global void setItem(Object item) { }

    global void setRecurrence(Slack.Reminder.Recurrence recurrence) { }

    global void setRecurring(Boolean recurring) { }

    global void setText(String text) { }

    global void setTime(Integer timeValue) { }

    global void setUser(String user) { }

    global override String toString() { return null; }

    global class Recurrence {
        global Recurrence() { }

        global Slack.Reminder.Recurrence clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getFrequency() { return null; }

        global List getWeekdays() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setFrequency(String frequency) { }

        global void setWeekdays(List weekdays) { }

        global override virtual String toString() { return null; }
    }
}