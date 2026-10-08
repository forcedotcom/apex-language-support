/**
 * Retrieves information from the tax engine and evaluates the information to define tax details.
 */
global interface TaxEngineAdapter {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * The processRequest method takes an instance of TaxEngineContext class and returns a response with the calculated tax details through the TaxDetailsResponse class or an error response through the ErrorResponse class.
     * @return Generic interface representing a response from a tax engine.
     */
    abstract commercetax.TaxEngineResponse processRequest(commercetax.TaxEngineContext context);

    virtual String toString();
}