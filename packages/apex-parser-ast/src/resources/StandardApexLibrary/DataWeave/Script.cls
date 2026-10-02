/**
 * Contains the createScript() method to load DataWeave scripts and the execute() method to obtain script output in a DataWeave.Result object.
 * <p>This example runs a DataWeave script from Apex and retrieves the resulting script output. First deploy the script to the org as ContactsToJson.dwl.
 * %dw 2.0
 * input records application/java
 * output application/json
 * ---
 * {
 *   users: records map(record) -> {
 *     firstName: record.FirstName,
 *     lastName: record.LastName
 *   }
 *
 * Then, execute the script from Apex.
 * List<Contact> data = [SELECT FirstName, LastName FROM Contact WHERE LastName LIMIT 5];
 * Map<String, Object> args = new Map<String, Object>{ 'records' => data };
 * DataWeave.Script script = DataWeave.Script.createScript('ContactsToJson');
 *
 * DataWeave.Result result = script.execute(args);
 * string jsonOutput = result.getValueAsString();
 */
@JsonAccess
global abstract class Script {
    global static dataweave.Script createScript(String scriptName) { return null; }

    /**
     * Loads a DataWeave 2.0 script from a specified namespace. The script can then be run using the Script.execute method.
     * @return DataWeave script that is used as a parameter in the Script.execute() method.
     */
    global static dataweave.Script createScript(String namespace, String scriptName) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global dataweave.Result execute() { return null; }

    global dataweave.Result execute(Map parameters) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the name of the script.
     */
    global override String toString() { return null; }
}