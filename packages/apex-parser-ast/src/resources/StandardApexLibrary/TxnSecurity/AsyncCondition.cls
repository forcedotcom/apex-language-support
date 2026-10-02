/**
 * Allows an implementing class to make asynchronous Apex calls. This interface is used only for transaction security Apex policies created in Real-Time Event Monitoring.
 * <p>Usage
 * If you make an <a class="xref" href="https://trailhead.salesforce.com/en/content/learn/modules/asynchronous_apex" target="_blank" title="HTML (New Window)">Asynchronous Apex</a> call in the class that implements your transaction security policy condition, the class must implement the TxnSecurity.AsyncCondition interface in addition to TxnSecurity.EventCondition. Use Asynchronous Apex instead of Apex callouts and DML statements, neither of which is allowed in transaction security Apex policies.
 * Apex offers multiple ways to run your Apex code asynchronously and all are supported in the TxnSecurity.AsyncCondition interface.
 * This interface has no methods.
 */
global interface AsyncCondition {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}