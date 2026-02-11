/*
 * Inheritance example for e2e testing.
 * Tests go-to-definition, hover, and outline across class hierarchies.
 */

/**
 * Base abstract class for all handlers.
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

/**
 * Concrete implementation of BaseHandler.
 */
public class AccountHandler extends BaseHandler {
    private List<Account> accounts;

    /**
     * Constructor.
     */
    public AccountHandler() {
        super('AccountHandler');
        this.accounts = new List<Account>();
    }

    /**
     * Implementation of abstract execute method.
     */
    public override void execute() {
        if (this.isEnabled) {
            processAccounts();
        }
    }

    /**
     * Override virtual method from base class.
     */
    public override String getHandlerInfo() {
        return super.getHandlerInfo() + ' - Accounts: ' + accounts.size();
    }

    /**
     * Class-specific method.
     */
    private void processAccounts() {
        for (Account acc : accounts) {
            // Process each account
            System.debug('Processing: ' + acc.Name);
        }
    }

    /**
     * Add account to collection.
     */
    public void addAccount(Account acc) {
        this.accounts.add(acc);
    }
}
