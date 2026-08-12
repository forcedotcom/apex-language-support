/*
 * Base handler class for e2e testing.
 * Used as the base class in inheritance go-to-definition and hover tests.
 */
public abstract class BaseHandler {
    protected String handlerName;
    protected Boolean isEnabled;

    /**
     * Constructor.
     */
    public BaseHandler(String name) {
        this.handlerName = name;
        this.isEnabled = true;
    }

    /**
     * Abstract method to be implemented by subclasses.
     */
    public abstract void execute();

    /**
     * Virtual method that can be overridden.
     */
    public virtual String getHandlerInfo() {
        return 'Handler: ' + handlerName;
    }

    /**
     * Final method that cannot be overridden.
     */
    public String getName() {
        return this.handlerName;
    }

    /**
     * Enable or disable the handler.
     */
    public void setEnabled(Boolean enabled) {
        this.isEnabled = enabled;
    }
}
