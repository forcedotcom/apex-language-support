public class InvalidLiteralOnSObject {
    public void runSwitch() {
        SObject obj = null;
        switch on obj {
            when 1 {
                System.debug('wrong');
            }
            when else {
                System.debug('other');
            }
        }
    }
}
