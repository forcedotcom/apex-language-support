public class SwitchWithInvalidEnum {
    public void testMethod() {
        EnumWithValues enumVar = EnumWithValues.VALUE1;
        
        switch on enumVar {
            when VALUE1 {
                System.debug('Value 1');
            }
            when INVALID_VALUE {
                // Wrong: INVALID_VALUE doesn't exist in EnumWithValues
                System.debug('Invalid');
            }
            when ANOTHER_INVALID {
                // Wrong: ANOTHER_INVALID doesn't exist in EnumWithValues
                System.debug('Another invalid');
            }
            when else {
                System.debug('Other');
            }
        }
    }
}
