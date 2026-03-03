/**
 * Retrieves information from the tax engine and evaluates the information to define tax details.
 */
global interface TaxEngineAdapter {

  commercetax.TaxEngineResponse processRequest(commercetax.TaxEngineContext var1);

}