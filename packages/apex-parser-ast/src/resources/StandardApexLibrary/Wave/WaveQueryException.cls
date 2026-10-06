global class WaveQueryException extends Exception {
    global WaveQueryException() { }

    global WaveQueryException(Exception null) { }

    global WaveQueryException(String null, Exception null) { }

    global override virtual Boolean equals(Object o) { return false; }

    global override virtual Exception getCause() { return null; }

    global override virtual List getDmlFieldNames(Integer index) { return null; }

    global override virtual List getDmlFields(Integer index) { return null; }

    global override virtual String getDmlId(Integer index) { return null; }

    global override virtual Integer getDmlIndex(Integer index) { return 0; }

    global override virtual String getDmlMessage(Integer index) { return null; }

    global override virtual String getDmlStatusCode(Integer index) { return null; }

    global override virtual System.StatusCode getDmlType(Integer index) { return null; }

    global virtual Map getInaccessibleFields() { return null; }

    global virtual Map getInaccessibleFields(Integer index) { return null; }

    global override virtual Integer getLineNumber() { return 0; }

    global override virtual String getMessage() { return null; }

    global override virtual Integer getNumDml() { return 0; }

    global override virtual String getStackTraceString() { return null; }

    global override virtual String getTypeName() { return null; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual void initCause(Exception cause) { }

    global override virtual void setMessage(String message) { }

    global virtual String toString() { return null; }
}