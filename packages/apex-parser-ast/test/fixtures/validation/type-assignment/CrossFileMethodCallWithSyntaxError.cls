public class TestClass {
    public void myMethod() {
        Property property = new Property();
        insert property;
        
        String base64Data = '/9j/4AAQSkZJRgABAQAAAQABAAD/';
        String fileName = 'file.png';
        String recordId = property.Id;
        
        String contentDocumentLinkId = FileUtilities.createFile(
            base64Data,
            fileName,
            recordId
        );
    }
}

public
