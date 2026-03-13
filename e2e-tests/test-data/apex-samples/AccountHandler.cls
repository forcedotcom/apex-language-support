/*
 * Inheritance example for e2e testing.
 * Extends a base class defined in a separate file.
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
