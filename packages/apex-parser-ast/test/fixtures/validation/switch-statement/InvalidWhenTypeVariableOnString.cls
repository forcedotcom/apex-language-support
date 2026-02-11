public class InvalidWhenTypeVariableOnString {
    public void runSwitch() {
        String value = 'test';
        switch on value {
            when Account acc {
                System.debug(acc);
            }
            when else {
                System.debug('other');
            }
        }
    }
}
