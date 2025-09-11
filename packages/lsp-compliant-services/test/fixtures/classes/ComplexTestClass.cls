public class ComplexTestClass {
    private String name;
    private Integer count;
    
    public ComplexTestClass() {
        this.name = 'Test';
        this.count = 0;
    }
    
    public ComplexTestClass(String name) {
        this.name = name;
        this.count = 0;
    }
    
    public void testFileUtilities() {
        String result = FileUtilities.createFile('test.txt', 'Hello World');
        System.debug(result);
        
        Boolean exists = FileUtilities.fileExists('test.txt');
        System.debug('File exists: ' + exists);
    }
    
    public void testAccountSObject() {
        Account acc = new Account('Test Account');
        String accountName = acc.Name;
        System.debug('Account name: ' + accountName);
        
        acc.updateBillingAddress('123 Main St', 'Anytown', 'CA', '12345', 'USA');
    }
    
    public void testUtilityClass() {
        String formatted = UtilityClass.formatString('  Hello World  ');
        System.debug('Formatted: ' + formatted);
        
        List<Integer> numbers = new List<Integer>{1, 2, 3, 4, 5};
        Integer sum = UtilityClass.calculateSum(numbers);
        System.debug('Sum: ' + sum);
    }
    
    public void testServiceClass() {
        String processed = ServiceClass.processData('test data');
        System.debug(processed);
        
        List<String> parts = ServiceClass.splitString('a,b,c', ',');
        System.debug('Parts: ' + parts);
    }
    
    public void testBuiltInTypes() {
        String message = 'Test message';
        Integer number = 42;
        Boolean flag = true;
        
        System.debug(message);
        System.debug('Number: ' + number);
        System.debug('Flag: ' + flag);
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public Integer getCount() {
        return count;
    }
    
    public void incrementCount() {
        this.count++;
    }
    
    public void incrementCount(Integer amount) {
        this.count += amount;
    }

    public void testStdApexClasses() {
        String encoded = EncodingUtil.urlEncode('Hello World', 'UTF-8');
        String decoded = EncodingUtil.urlDecode('Hello%20World', 'UTF-8');
    }

    public void testResolveViaVariable() {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://www.example.com');
        request.setMethod('GET');
        HttpResponse response = http.send(request);
        if (response.getStatusCode() == 200) {
            System.debug('Response: ' + response.getBody());
        }
    }

    public void testResolveComplexTypesAndExpressions() {
        List<Coordinates> computedCoordinates = new List<Coordinates>();

        for (GeocodingAddress address : addresses) {
            String geocodingUrl = BASE_URL;
            geocodingUrl += (String.isNotBlank(address.street))
                ? '&street=' + address.street
                : '';
            geocodingUrl += (String.isNotBlank(address.city))
                ? '&city=' + address.city
                : '';
            geocodingUrl += (String.isNotBlank(address.state))
                ? '&state=' + address.state
                : '';
            geocodingUrl += (String.isNotBlank(address.country))
                ? '&country=' + address.country
                : '';
            geocodingUrl += (String.isNotBlank(address.postalcode))
                ? '&postalcode=' + address.postalcode
                : '';

            Coordinates coords = new Coordinates();
            if (geocodingUrl != BASE_URL) {
                Http http = new Http();
                HttpRequest request = new HttpRequest();
                request.setEndpoint(geocodingUrl);
                request.setMethod('GET');
                request.setHeader(
                    'http-referer',
                    URL.getOrgDomainUrl().toExternalForm()
                );
                HttpResponse response = http.send(request);
                if (response.getStatusCode() == 200) {
                    List<Coordinates> deserializedCoords = (List<Coordinates>) JSON.deserialize(
                        response.getBody(),
                        List<Coordinates>.class
                    );
                    coords = deserializedCoords[0];
                }
            }

            computedCoordinates.add(coords);
        }
    }
}
