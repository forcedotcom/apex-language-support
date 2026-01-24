/**
 * More complex test file to trigger workspace loading and compilation logs
 */
public class ComplexLoggingTest {
    private String name;
    private Integer count;
    private List<String> items;

    public ComplexLoggingTest() {
        this.name = 'Test';
        this.count = 0;
        this.items = new List<String>();
    }

    public void addItem(String item) {
        if (item != null && item.length() > 0) {
            items.add(item);
            count++;
            System.debug('Added item: ' + item);
        }
    }

    public String getName() {
        return this.name;
    }

    public Integer getCount() {
        return this.count;
    }

    public List<String> getItems() {
        return this.items.clone();
    }

    public class InnerClass {
        public String value;

        public InnerClass(String val) {
            this.value = val;
        }

        public String getValue() {
            return value;
        }
    }
}
