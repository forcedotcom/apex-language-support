public class LoopVariableMismatch {
    public void invalidLoop() {
        for (Integer i : [SELECT Id FROM Account]) {  // LOOP_VARIABLE_MISMATCH_SOBJECT_TYPE
            System.debug(i);
        }
    }
}
