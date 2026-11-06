/**
 * Base class for all Apex exceptions.
 * Namespace: System
 */
public virtual class Exception {
    public Exception() { }

    public Exception(String message) { }

    public Exception(Exception cause) { }

    public Exception(String message, Exception cause) { }

    public virtual Exception getCause() { }

    public virtual Integer getLineNumber() { }

    public virtual String getMessage() { }

    public virtual String getStackTraceString() { }

    public virtual String getTypeName() { }

    public virtual void initCause(Exception cause) { }

    public virtual void setMessage(String message) { }
}
