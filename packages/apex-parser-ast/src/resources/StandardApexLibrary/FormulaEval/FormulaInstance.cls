/**
 * Contains a method to evaluate the formula instance.
 * <p>Example
 * global class MotorYacht {
 *    global Integer lengthInYards;
 *    global Integer numOfGuestCabins;
 *    global String name;
 *    global Account owner;
 * }
 * MotorYacht aBoat = new MotorYacht();
 * aBoat.lengthInYards = 52;
 * aBoat.numOfGuestCabins = 4;
 * aBoat.name = 'RV Foo';
 * FormulaEval.FormulaInstance isItSuper = Formula.builder()
 *                             .withReturnType(FormulaEval.FormulaReturnType.STRING)
 *                             .withType(MotorYacht.class)
 *                             .withFormula('IF(lengthInYards < 100, "Not Super", "Super")')
 *                             .build();
 * isItSuper.evaluate(aBoat); //=> "Not Super"
 *
 * aBoat.owner = new Account(Name='Acme Watercraft', Site='New York');
 * FormulaEval.FormulaInstance ownerDetails = Formula.builder()
 *                             .withReturnType(FormulaEval.FormulaReturnType.STRING)
 *                             .withType(MotorYacht.class)
 *                             .withFormula('owner.Name & " (" & owner.Site & ")"')
 *                             .build();
 * ownerDetails.evaluate(aBoat); //=> "Acme Watercraft (New York)"
 * <p>Usage
 * The context type in the withType method must be a global, user-defined Apex class. Any fields or properties that the formula references must also be global.
 */
global class FormulaInstance {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Calculates the formula expression and returns the formula output.
     * @return Object Apex type that corresponds to the Apex class as configured by the withType() method in the FormulaBuilder class.
     */
    global Object evaluate(Object contextObject) { return null; }

    /**
     * Returns a set of strings that denote the field names referenced in a formula.
     * <p>Usage
     * A formula is built and evaluated in the context of the current namespace of the subscriber org. If you package a formula that references fields, the fields must be fully qualified with the namespace name.
     * <p>Example
     * FormulaEval.FormulaInstance ff = Formula.builder()
     *                                  .withType(Schema.Account.class)
     *                                  .withReturnType(FormulaEval.FormulaReturnType.STRING)
     *                                  .withFormula('name & website')
     *                                  .build();
     *
     * // Returns the field names 'name', and 'website' required to process the formula
     * Set<String> fieldNames = ff.getReferencedFields();
     *
     * // Use the list of field names to generate dynamic soql
     * String queryStr = 'select ' + string.join(fieldNames, ', ') + ' from Account limit 1';
     * List<sObject> accounts = Database.query(queryStr);
     * string formulaOutput = (string)ff.evaluate(accounts[0]);
     * System.debug(formulaOutput);
     */
    global Set getReferencedFields() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}