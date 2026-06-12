/**
 * Contains the createScript() method to load DataWeave scripts and the execute() method to obtain script output in a DataWeave.Result object.
 */
global class Script {

  global Script() {}

  global static createScript(String scriptName) {}

  global static dataweave.Script createScript(String namespace, String scriptName) {}

  global String toString() {}

  global Object clone() {}

  global dataweave.Result execute(Map<String,Object> parameters) {}

  global dataweave.Result execute() {}

}