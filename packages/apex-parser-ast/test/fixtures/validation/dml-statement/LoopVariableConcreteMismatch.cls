public class LoopVariableConcreteMismatch {
    public void invalidLoop() {
        for (Contact c : [SELECT Id FROM Account]) {  // LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE
            System.debug(c);
        }
    }
}
