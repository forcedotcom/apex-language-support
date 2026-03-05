public class InvalidWhenFieldConstant {
    public String nonConstantField = 'a';

    public void runSwitch() {
        String value = 'test';
        switch on value {
            when nonConstantField {
                System.debug('wrong - field not static final');
            }
            when else {
                System.debug('other');
            }
        }
    }
}
