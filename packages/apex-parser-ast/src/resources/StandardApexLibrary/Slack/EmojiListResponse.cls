global class EmojiListResponse {
    global Object EmojiListResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getCacheTs() { return null; }

    global List getCategories() { return null; }

    global String getCategoriesVersion() { return null; }

    global Map getEmoji() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setCacheTs(String cacheTs) { }

    global void setCategories(List categories) { }

    global void setCategoriesVersion(String categoriesVersion) { }

    global void setEmoji(Map emoji) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Category {
        global Object Category() { return null; }

        global Slack.EmojiListResponse.Category clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getEmojiNames() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setEmojiNames(List emojiNames) { }

        global void setName(String name) { }

        global override virtual String toString() { return null; }
    }
}