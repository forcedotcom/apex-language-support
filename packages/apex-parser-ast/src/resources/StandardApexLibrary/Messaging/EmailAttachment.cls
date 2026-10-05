global class EmailAttachment {
    global Blob body { get; set; }
    global String contentid { get; set; }
    global String contenttype { get; set; }
    global String filename { get; set; }

    global EmailAttachment() { }

    global Boolean equals(Object obj) { return false; }

    global Blob getBody() { return null; }

    global String getContentId() { return null; }

    global String getContentType() { return null; }

    global String getFileName() { return null; }

    global Integer hashCode() { return 0; }

    global void setBody(Blob param1) { }

    global void setContentId(String param1) { }

    global void setContentType(String param1) { }

    global void setFileName(String param1) { }

    global String toString() { return null; }
}