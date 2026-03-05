public class DuplicateWhenValues {
    public void testSwitch() {
        String value = 'test';
        switch on value {
            when 'one' {
                System.debug('one');
            }
            when 'one' {
                System.debug('duplicate');
            }
            when else {
                System.debug('else');
            }
        }
    }
}
