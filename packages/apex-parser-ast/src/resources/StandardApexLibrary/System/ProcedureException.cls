global class ProcedureException extends Exception {
    global ProcedureException() { }

    global ProcedureException(Exception param1) { }

    global ProcedureException(String param1) { }

    global ProcedureException(String param1, Exception param2) { }

    global Boolean equals(Object obj) { return false; }

    global Exception getCause() { return null; }

    global Map getInaccessibleFields() { return null; }

    global Integer getLineNumber() { return 0; }

    global String getMessage() { return null; }

    global String getStackTraceString() { return null; }

    global String getTypeName() { return null; }

    global Integer hashCode() { return 0; }

    global void initCause(Exception cause) { }

    global void setMessage(String message) { }

    global String toString() { return null; }
}