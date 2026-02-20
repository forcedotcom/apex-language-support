public class SwitchWithValidEnum {
    public void testMethod() {
        EnumWithValues enumVar = EnumWithValues.VALUE1;
        
        switch on enumVar {
            when VALUE1 {
                System.debug('Value 1');
            }
            when VALUE2 {
                System.debug('Value 2');
            }
            when VALUE3 {
                System.debug('Value 3');
            }
            when else {
                System.debug('Other');
            }
        }
    }
}
