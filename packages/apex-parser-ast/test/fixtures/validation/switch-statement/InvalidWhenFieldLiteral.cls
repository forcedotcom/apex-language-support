public class InvalidWhenFieldLiteral {
    public static final String NULL_CONST = null;

    public void runSwitch() {
        String value = 'test';
        switch on value {
            when NULL_CONST {
                System.debug('wrong - null constant');
            }
            when else {
                System.debug('other');
            }
        }
    }
}
