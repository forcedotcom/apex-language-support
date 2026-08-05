public class DuplicateWhenListValue {
    public void testSwitch() {
        String value = 'test';
        switch on value {
            when 'one', 'two' {
                System.debug('first');
            }
            when 'two' {
                System.debug('duplicate');
            }
        }
    }
}
