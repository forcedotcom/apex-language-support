/**
 * Provides methods for creating digests, message authentication codes, and signatures, as well as encrypting and decrypting information.
 * Usage
 * The methods in the Crypto class can be used for securing content in Lightning Platform, or for integrating with external services such as Google or Amazon WebServices (AWS).
 * Each method in this class supports a unique set of AES encryption algorithms, depending on its purpose. To confirm which algorithms are available for the action that you want to do, check each method.
 * Using Encryption Algorithms
 * The Crypto class supports Galois Counter Mode (GCM) and Cipher Block Chaining mode (CBC). The GCM AES256-GCM algorithm is valid in all encrypt and decrypt variants Currently, only the 256-bit size is supported for GCM. CBC algorithms in 128-bit, 192-bit, and 256-bit sizes are valid in all variants except those that expect additional authentication data (an aaD parameter).
 * When you use CBC with encrypt and decrypt, you provide a 16-bit initialization vector (IV).
 * When you use GCM with encrypt and decrypt, you provide no initialization vector (IV).
 * When you use CBC with encryptWithManagedIV and decryptWithManagedIV, Salesforce provides the IV. You provide no additional authentication data (aaData). You can only use CBC with encryptWithManagedIV and decryptWithManagedIV if you use the version which does not expect aaData.
 * When you use GCM with encryptWithManagedIV and decryptWithManagedIV, Salesforce provides an IV. and you can optionally provide the aaData
 * When use the Crypto class to encrypt using GCM, the final encrypted content includes the length of the IV (always 12), the Salesforce-generated 12-byte IV, and the cipher text.
 * Encryption Algorithms
 * The Crypto class supports these encryption algorithms.
 * MODE VARIANT DESCRIPTION
 * CBC (Cipher Block Chaining) AES128, AES128-CBC AES 128-bit with CBC mode with PKCS7 padding. Use either of these two values.
 * AES192, AES192-CBC AES 192-bit with CBC mode with PKCS7 padding. Use either of these two values.
 * AES256, AES256-CBC AES 256-bit with CBC mode with PKCS7 padding. Use either of these two values.
 * GCM (Galois Counter Mode) AES256-GCM AES 256-bit with GCM mode with no padding. Currently, only the 256-bit size is supported for GCM.
 * Signing Algorithms
 * The Crypto class supports these signing algorithms.
 * TYPE VARIANT DESCRIPTION
 * RSA RSA, RSA-SHA1 An RSA signature (with an asymmetric key pair) of an SHA1 hash. Use either of these two values.
 * RSA-SHA256 RSA signature of an SHA256 hash
 * RSA-SHA384 RSA signature of an SHA384 hash
 * RSA-SHA512 RSA signature of an SHA512 hash
 * ECDSA (DER) ECDSA-SHA256 ECDSA signature of an SHA256 hash
 * ECDSA-SHA384 ECDSA signature of an SHA384 hash
 * ECDSA-SHA512 ECDSA signature of an SHA512 hash
 * ECDSA (P1363) ECDSA-SHA256-P1363 ECDSA signature of an SHA256 hash (P1363 format)
 * ECDSA-SHA256-PLAIN ECDSA signature of an SHA256 hash (P1363 format). Use if the JWT returns invalid_client. See Other Errors on this page.
 * ECDSA-SHA384-P1363 ECDSA signature of an SHA256 hash (P1363 format)
 * ECDSA-SHA512-P1363
 * Encrypt and Decrypt Exceptions
 * These exceptions can be thrown for these methods.
 * decrypt
 * encrypt
 * decryptWithManagedIV
 * encryptWithManagedIV
 * Exception Message Description
 * InvalidParameterValue Unable to parse the initialization vector from encrypted data. Thrown if you’re using managed initialization vectors, and the cipher text is less than 16 bytes.
 * Invalid algorithm algoName. Must be one of the suported AES algorithms listed on this page. Thrown if the algorithm name isn’t one of the valid values.
 * Invalid private key. Must be size bytes. Thrown if the size of the private key doesn’t match the specified algorithm.
 * Invalid initialization vector. For CBC, this must be 16 bytes. For GCM, the IV is 12 bytes. Thrown if the initialization vector provided for a CBC encryption isn’t 16 bytes.
 * AAD can only be used with AESGCM algorithms. Thrown if a value is supplied for aaData, but the encryption algorithm isn’t a GCM type.
 * Invalid data. Input data is size bytes, which exceeds the limit of 1,048,576 bytes. Thrown if the data is greater than 1 MB. For decryption, 1,048,608 bytes are allowed for the initialization vector header, plus any additional padding the encryption added to align to block size.
 * NullPointerException Argument can’t be null. Thrown if one of the required method arguments is null.
 * SecurityException Given final block isn’t properly padded. Thrown if the data isn’t properly block-aligned or similar issues occur during encryption or decryption.
 * SecurityException Message Varies Thrown if something goes wrong during either encryption or decryption.
 * These exceptions are a subset of the exceptions that can be thrown from the System namespace. Refer to Exception Class and Built-In Exceptions
 * For CBC, the Crypto class uses AES / CBC / PKCS7 padding, which is vulnerable to a <a class="xref" href="https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/02-Testing_for_Padding_Oracle" target="_blank">Padding Oracle</a> attack. You can protect against a Padding Oracle attack by using the Encrypt-then-MAC method. In this method, you encrypt the cipher text and MAC separately.
 * For encryption, first encrypt the data with AES by using one encryption key. Then, with a different encryption key, use the generateMac(algorithmName, input, privateKey) method to generate a message authentication code (MAC) for the cipher text. Append the MAC to the cipher text before sending it to its recipient.
 * For decryption, start by checking the authenticity and integrity of the cipher text by using the verifyHMac(algorithmName, data, privateKey, macToVerify) method. If either the authenticity or integrity check fails, throw an exception and don’t decrypt the cipher text. The decryption of the cipher text must only happen in a second step, after the message authenticity and integrity has been verified.
 * You can also protect against a Padding Oracle attack by using a GCM encryption algorithm.
 * Other Errors
 * Under rare conditions you may encounter the invalid_client error from the JSON Web Tokens (JWT) service.
 * Error Message Description
 * invalid_client The actual text varies, but describes the inability to validate the client credentials. The JWT public certificate in the Salesforce Connected Application doesn’t appear to match the known private key.
 * For Shield Platform Encryption, this error can happen when you use a custom JWT implementation that uses the P11363 format, and you also want to use the ECDSA-SHA256 algorithm. The solution is to specify the ECDSA-SHA256-PLAIN algorithm instead. The ECDSA-SHA256-PLAIN is available to the several sign() and verify() methods.
 * For example, in order to comply with your program requirements, you sign your token using the Elliptic Curve Digital Signature Algorithm (ECDSA) with the P-256 curve. This algorithm is in the P1363 format, so when you try to use Crypto.verify() using the ECDSA SHA256, you receive a response containing invalid_client. You change ECDSA-SHA256 to ECDSA-SHA256-PLAIN and the error is resolved.
 * Running the Crypto Class Samples
 * Each of the methods in this section contains a code sample to demonstrate the method's use. The samples use curl to make calls into your Salesforce org. Use your preferred developer environment to run the samples. Use the Salesforce developer <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_rest.meta/api_rest/intro_rest.htm" target="_blank">Introduction to REST API</a> for basic information on making REST calls into Salesforce. Also, <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_encryption_rest_api_guide.meta/platform_encryption_rest_api_guide/api_rest_encryption.htm" target="_blank">Introducing the Salesforce Shield Platform Encryption REST API</a> gives you starter information on using REST to work with Shield Platform Encryption.
 */
global class Crypto {
    global Crypto() { }

    /**
     * Decrypts the cipherText blob by using the specified algorithm, private key, and initialization vector. Use this method to decrypt blobs encrypted by using a third-party application or the encrypt method.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create this Apex class.
     *     public class TestDecrypt {
     *
     *         public void testDecrypt(){
     *             // 16-byte string
     *             Blob exampleIv = Blob.valueOf('Example of IV123');
     *             Blob key = Crypto.generateAesKey(128);
     *             Blob data = Blob.valueOf('Data to be encrypted');
     *             Blob encrypted = Crypto.encrypt('AES128', key, exampleIv, data);
     *
     *             Blob decrypted = Crypto.decrypt('AES128', key, exampleIv, encrypted);
     *             String decryptedString = decrypted.toString();
     *             System.debug('Decrypted Value: ' + decryptedString);
     *             Assert.areEqual('Data to be encrypted', decryptedString, 'Error: not equal!');
     *             return;
     *         }
     *     }
     * To invoke this method, run:
     * TestDecrypt td = new TestDecrypt();
     * td.testDecrypt();
     * @return Contains the decrypted contents of cipherText.
     */
    global static Blob decrypt(String algorithmName, Blob secretKey, Blob initializationVector, Blob encryptedData) { return null; }

    global static Blob decrypt(String algorithm, String enc, Blob privateKey, Blob ephemeralPublicKey, Blob encryptedKey, Blob iv, Blob ciphertext, Blob tag, Blob aad) { return null; }

    /**
     * Decrypts the IVAndCipherText blob by using the specified algorithm and private key. Use this method to decrypt blobs encrypted by using a third-party application or the encryptWithManagedIV method. This version of decryptWithManagedIV doesn’t use additional authentication data.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create this Apex class.
     *     public class TestDecryptWithManagedIV {
     *
     *         public void testDecryptWithManagedIV(){
     *             String algorithmName = 'AES128';
     *             Blob key = Crypto.generateAesKey(128);
     *             Blob data = Blob.valueOf('Data to be encrypted');
     *             Blob encrypted = Crypto.encryptWithManagedIV(algorithmName, key, data);
     *             Blob decrypted = Crypto.decryptWithManagedIV(algorithmName, key, encrypted);
     *             String decryptedString = decrypted.toString();
     *             Assert.areEqual('Data to be encrypted', decryptedString, 'Error: the strings are not equal!');
     *
     *         }
     *     }
     * To invoke this method, run:
     * TestDecryptWithManagedIV tdiv = new TestDecryptWithManagedIV();
     * tdiv.testDecryptWithManagedIV();
     * @return Contains the decrypted contents of IVAndCipherText.
     */
    global static Blob decryptWithManagedIV(String algorithmName, Blob secretKey, Blob encryptedData) { return null; }

    /**
     * Decrypts the IVAndCipherText blob by using the specified algorithm and private key. Use this method to decrypt blobs encrypted by using a third-party application or the encryptWithManagedIV method. This version of decryptWithManagedIV uses additional authentication data. CBC isn’t supported for this method.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create this Apex class.
     *     public class TestDecryptWithManagedIV {
     *
     *         public void testDecryptWithManagedIV(){
     *             String algorithmName = 'AES256-GCM';
     *             Blob key = Crypto.generateAesKey(256);
     *             Blob data = Blob.valueOf('Data to be encrypted');
     *             Blob aad = Blob.valueOf('Additional tag');
     *             Blob encrypted = Crypto.encryptWithManagedIV(algorithmName, key, data, aad);
     *             Blob decrypted = Crypto.decryptWithManagedIV(algorithmName, key, encrypted, aad);
     *             String decryptedString = decrypted.toString();
     *             Assert.areEqual('Data to be encrypted', decryptedString, 'Error: the strings are not equal!');
     *
     *         }
     *     }
     * To invoke this method, run:
     * TestDecryptWithManagedIV tdiv = new TestDecryptWithManagedIV();
     * tdiv.testDecryptWithManagedIV();
     * @return Contains the decrypted contents of IVAndCipherText.
     */
    global static Blob decryptWithManagedIV(String algorithmName, Blob secretKey, Blob encryptedData, Blob aaData) { return null; }

    /**
     * Encrypts the clearText blob by using the specified algorithm, private key, and initialization vector. Use this method when you want to specify your own initialization vector.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create this Apex class.
     *     public class TestEncrypt {
     *
     *         public void testEncrypt(){
     *             Blob exampleIv = Blob.valueOf('Example of IV123');
     *             Blob key = Crypto.generateAesKey(128);
     *             Blob data = Blob.valueOf('Encryption Example Text.');
     *             Blob encrypted = Crypto.encrypt('AES128', key, exampleIv, data);
     *
     *             Blob decrypted = Crypto.decrypt('AES128', key, exampleIv, encrypted);
     *             String decryptedString = decrypted.toString();
     *             Assert.areEqual('Encryption Example Text.', decryptedString, 'Error: the values are not equal!');
     *             return;
     *         }
     *     }
     * To invoke this method, run:
     * TestEncrypt te = new TestEncrypt();
     * te.testEncrypt();
     * @return Contains the encrypted contents of clearText.
     */
    global static Blob encrypt(String algorithmName, Blob secretKey, Blob initializationVector, Blob clearData) { return null; }

    global static Blob encrypt(String algorithm, String enc, Blob recipientPublicKey, Blob ephemeralPrivateKey, Blob ephemeralPublicKey, Blob cek, Blob iv, Blob plaintext, Blob aad) { return null; }

    /**
     * Encrypts the clearText blob by using the specified algorithm and private key. Use this method when you want Salesforce to generate the initialization vector. This version of encryptWithManagedIV doesn’t use additional authentication data.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create this Apex class.
     *     public class TestEncryptWithManagedIV {
     *
     *         public void testEncryptWithManagedIV(){
     *             String algorithmName = 'AES128';
     *             Blob key = Crypto.generateAesKey(128);
     *             Blob data = Blob.valueOf('Data to be encrypted');
     *             Blob encrypted = Crypto.encryptWithManagedIV(algorithmName, key, data);
     *             Blob decrypted = Crypto.decryptWithManagedIV(algorithmName, key, encrypted);
     *             String decryptedString = decrypted.toString();
     *             Assert.areEqual('Data to be encrypted', decryptedString, 'Error: the strings are not equal!');
     *
     *         }
     *     }
     * To invoke this method, run:
     * TestEncryptWithManagedIV teiv = new TestEncryptWithManagedIV();
     * teiv.testEncryptWithManagedIV();
     * @return Contains the encrypted contents of clearText.
     * For CBC, the initialization vector is stored as the first 128 bits (16 bytes) of the encrypted blob.
     * For GCM, the return value contains the length of the IV (always 12) followed by a 96 bit (12 byte) Salesforce generated IV, with the ciphertext following.
     * Use either third-party applications or the decryptWithManagedIV method to decrypt blobs encrypted with this method. Use the encrypt method if you want to generate your own initialization vector.
     */
    global static Blob encryptWithManagedIV(String algorithmName, Blob secretKey, Blob clearData) { return null; }

    /**
     * Encrypts the clearText blob by using the specified algorithm and private key. Use this method when you want Salesforce to generate the initialization vector. This version of encryptWithManagedIV uses additional authentication data. CBC isn’t supported for this method.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create this Apex class.
     *     public class TestEncryptWithManagedIV {
     *
     *         public void testEncryptWithManagedIV(){
     *             String algorithmName = 'AES256-GCM';
     *             /*
     *                No IV if you specify AES256-GCM
     *             * /
     *             Blob key = Crypto.generateAesKey(256);
     *             Blob data = Blob.valueOf('Data to be encrypted');
     *             Blob aad = Blob.valueOf('Additional tag');
     *             Blob encrypted = Crypto.encryptWithManagedIV(algorithmName, key, data, aad);
     *             Blob decrypted = Crypto.decryptWithManagedIV(algorithmName, key, encrypted, aad);
     *             String decryptedString = decrypted.toString();
     *             Assert.areEqual('Data to be encrypted', decryptedString, 'Error: the strings are not equal!');
     *
     *         }
     *     }
     * To invoke this method, run:
     * TestEncryptWithManagedIV teiv = new TestEncryptWithManagedIV();
     * teiv.testEncryptWithManagedIV();
     * @return Contains the encrypted contents of clearText. For GCM, the return value contains the length of the IV (always 12) followed by a 96 bit (12 byte) Salesforce generated IV, with the ciphertext following.
     */
    global static Blob encryptWithManagedIV(String algorithmName, Blob secretKey, Blob clearData, Blob aaData) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Generates an Advanced Encryption Standard (AES) key.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class:
     *     public class TestGenerateAESKey {
     *
     *         public void testGenerateAESKey() {
     *           Blob key = Crypto.generateAesKey(128);
     *           System.debug('Generated AES Key: ');
     *           String strKey = EncodingUtil.base64Encode(key);
     *           System.debug(strKey);
     *
     *         }
     *     }
     *
     * To invoke this method, run the following:
     * TestGenerateAESKey tgaes = new TestGenerateAESKey();
     * tgaes.testGenerateAESKey();
     * @return Contains the generated AES key.
     */
    global static Blob generateAesKey(Integer size) { return null; }

    /**
     * Computes a secure, one-way hash digest using the specified algorithm on the supplied input blob.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class:
     *     public class TestGenerateDigest {
     *
     *         public void testGenerateDigest(){
     *             Blob targetBlob = Blob.valueOf('ExampleMD5String');
     *             Blob hash = Crypto.generateDigest('MD5', targetBlob);
     *             String result = EncodingUtil.base64Encode(hash);
     *             System.debug('Value: ' + result);
     *         }
     *     }
     *
     * To invoke this method, run the following:
     * TestGenerateDigest tgd = new TestGenerateDigest();
     * tgd.testGenerateDigest();
     * @return Contains the generated digest.
     */
    global static Blob generateDigest(String algorithmName, Blob input) { return null; }

    global static Blob generateKeyPair(String algorithm) { return null; }

    /**
     * Computes a message authentication code (MAC) for the input blob value using the private key and the specified algorithm.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class:
     *     public class TestGenerateMAC {
     *
     *         public void testGenerateMAC() {
     *             String salt = String.valueOf(Crypto.getRandomInteger());
     *             String key = 'key';
     *             Blob data = crypto.generateMac('HmacSHA256',
     *                                             Blob.valueOf(salt),
     *                                             Blob.valueOf(key));
     *             System.debug('Generated MAC: ');
     *             System.debug(EncodingUtil.base64Encode(data));
     *         }
     *     }
     * To invoke this method, run the following:
     * TestGenerateMAC tgm = new TestGenerateMAC();
     * tgm.testGenerateMAC();
     * @return The message authentication code.
     */
    global static Blob generateMac(String algorithmName, Blob input, Blob privateKey) { return null; }

    global static Blob getPrivateKey(Blob keyPairBlob) { return null; }

    global static Blob getPublicKey(Blob keyPairBlob) { return null; }

    /**
     * Returns a random integer value.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to exercise this function. Create the following Apex class:
     *     public class TestGetRandomInteger {
     *
     *         public void testGetRandomInteger() {
     *             Integer i1 = Crypto.getRandomInteger();
     *             Integer i2 = Crypto.getRandomInteger();
     *             System.debug('Integer 1: ' + i1);
     *             System.debug('Integer 2: ' + i2);
     *             Assert.areNotEqual(i1, i2, 'Sorry, those aren’t random!');
     *             //This is just an example. This is not a true test of randomness
     *         }
     *     }
     * To invoke this method, run the following:
     * TestGetRandomInteger tri = new TestGetRandomInteger();
     * tri.testGetRandomInteger();
     * @return Returns a random 4-byte integer. Salesforce invokes the java.security.SecureRandom api to generate this number. For information on how the number is generated, see <a class="xref" href="https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/security/SecureRandom.html" target="_blank">java.security.SecureRandom</a>.
     */
    global static Integer getRandomInteger() { return 0; }

    /**
     * Returns a random long value.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to exercise this function. Create the following Apex class:
     *     public class TestGetRandomLong {
     *
     *         public void testGetRandomLong() {
     *             Long L1 = Crypto.getRandomLong();
     *             Long L2 = Crypto.getRandomLong();
     *             System.debug('Long 1: ' + L1);
     *             System.debug('Long 2: ' + L2);
     *             Assert.areNotEqual(L1, L2, 'Sorry, not random!');
     *             //This is just an example. This is not a true test of randomness
     *         }
     *     }
     * To invoke this method, run the following:
     * TestGetRandomLong trl = new TestGetRandomLong();
     * trl.testGetRandomLong();
     * @return Returns a random 8-byte long. Salesforce invokes the java.security.SecureRandom api to generate this number. For information on how the number is generated, see <a class="xref" href="https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/security/SecureRandom.html" target="_blank">java.security.SecureRandom</a>.
     */
    global static Long getRandomLong() { return 0L; }

    global virtual Integer hashCode() { return 0; }

    global static System.JweToken parseJwe(Blob jweToken) { return null; }

    /**
     * Computes a unique digital signature for the input blob value, using the specified algorithm and the supplied private key.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. To run it correctly, you need a PKCS8 private key. At your terminal, use openssl to create one. First, create the key. Then convert it to PKCS8:
     * $ openssl genrsa -out myprivatekey.pem 1024
     * $ openssl pkey -in myprivatekey.pem -out myprivatekey.pkcs8.pem
     * After you create the PKCS8 compatible key, you decode just the key portion of the text (without the BEGIN PRIVATE KEY or END PRIVATE KEY lines) for the privateKey parameter.
     *     public class TestSign {
     *
     *         public void testSign() {
     *                 Blob input = Blob.valueOf('Some text.');
     *                 String algorithmName = 'RSA';
     *                 String rawKey = '<text value of your pkcs8 private key>';
     *
     *                 //no BEGIN PRIVATE KEY or END PRIVATE KEY header/footer !
     *                 Blob privateKey = EncodingUtil.base64Decode(rawKey);
     *                 System.debug(privateKey);
     *                 Blob signedKey = Crypto.sign(algorithmName, input, privateKey);
     *
     *         }
     *     }
     * To invoke this method, run the following:
     * TestSign ts = new TestSign();
     * ts.testSign();
     * @return The new digital signature.
     */
    global static Blob sign(String algorithmName, Blob input, Blob privateKey) { return null; }

    /**
     * Computes a unique digital signature for the input blob value, using the specified algorithm and the supplied certificate and key pair.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class. For the TestCertName variable, use the unique name value for a self-signed or CA certificate that you have created in the org in which you run this test.
     *     public class TestSignWithCert {
     *
     *         public void testSignWithCert() {
     *
     *             String algorithmName = 'RSA';
     *             Blob input = Blob.valueOf('Test Sign With Certificate.');
     *             String TestCertName = 'your-cert-unique-name';
     *             Blob signedKey = Crypto.signWithCertificate(algorithmName, input, TestCertName);
     *         }
     *     }
     * To invoke the method, run the following:
     * TestSignWithCert tswc = new TestSignWithCert();
     * tswc.testSignWithCert();
     * @return The signed content.
     */
    global static Blob signWithCertificate(String algorithmName, Blob input, String certDevName) { return null; }

    /**
     * Envelops the signature into an XML document.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class. For the testCertName variable, use the unique name value for a self-signed or CA certificate that you have created in the org in which you run this test.
     *   public class TestSignXML {
     *     public void testSignXML() {
     *       String algorithmName = 'RSA';
     *       String testCertName = 'your-cert-unique-name';
     *       Dom.Document doc = new Dom.Document();
     *       String docToLoad = '<?xml version="1.0"?>\n' +
     *       '<customers>\n' +
     *       '  <customer id="2">\n' +
     *       '    <name>Company One</name>\n' +
     *       '  </customer>\n' +
     *       '</customers>';
     *       doc.load(docToLoad);
     *
     *       System.Crypto.signXML(algorithmName, doc.getRootElement(), null, testCertName);
     *
     *       //dump the content of the signed XML document to the debug log
     *       System.Debug(doc.toXmlString());
     *     }
     *   }
     * To invoke this method, run the following:
     * TestSignXML tswxml = new TestSignXML();
     * tswxml.testSignXML();
     * @return This method doesn’t return a value. The signature envelope is inserted within node.
     */
    global static void signXml(String algorithmName, dom.XmlNode node, String idAttributeName, String certDevName) { }

    /**
     * Inserts the signature envelope before the specified child node.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class. For the testCertName variable, use the unique name value for a self-signed or CA certificate that you have created in the org in which you run this test.
     *     public class TestSignXML_2 {
     *         public void testSignXML_2() {
     *             String algorithmName = 'RSA';
     *             String testCertName = 'your-cert-unique-name';
     *             Dom.Document doc = new Dom.Document();
     *             String docToLoad = '<?xml version="1.0"?>\n' +
     *             '<customers>\n' +
     *             '  <customer id="2">\n' +
     *             '    <name>Company One</name>\n' +
     *             '  </customer>\n' +
     *             '</customers>';
     *             doc.load(docToLoad);
     *             Dom.XmlNode rootNode = doc.getRootElement();
     *             Dom.XmlNode commentNode = rootNode.addCommentNode('SomeComment');
     *
     *             System.Crypto.signXML(algorithmName, doc.getRootElement(), null, testCertName, commentNode);
     *
     *             //send the content of the signed XML document to the debug log
     *             System.Debug(doc.toXmlString());
     *         }
     *
     *     }
     * To invoke this method, run the following:
     * TestSignXML_2 tswxml2 = new TestSignXML_2();
     * tswxml2.testSignXML_2();
     * @return This method doesn’t return a value. The signature envelope is inserted within node.
     */
    global static void signXml(String algorithmName, dom.XmlNode node, String idAttributeName, String certDevName, dom.XmlNode refChild) { }

    global override virtual String toString() { return null; }

    /**
     * Verifies the digital signature for the data blob using the specified algorithm and the public key associated with certDevName. Use this method to verify a blob signed by a digital signature created using a third-party application or the signWithCertificate method.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class. For the TestCertName variable, use the unique name value for a self-signed or CA certificate that you have created in the org in which you run this test.
     *     public class TestVerify_2 {
     *        public void testVerify_2() {
     *
     *            String algorithmName = 'RSA';
     *            Blob input = Blob.valueOf('Test Sign With Certificate.');
     *            String TestCertName = 'your-cert-unique-name';
     *            Blob signedKey = Crypto.signWithCertificate(algorithmName, input, TestCertName);
     *
     *            Boolean verified = false;
     *            verified = Crypto.verify(algorithmName, input, signedKey, TestCertName);
     *            Assert.areEqual(true, verified);
     *        }
     *   }
     *
     * To invoke this method, run the following:
     * TestVerify_2 tv_2 = new TestVerify_2();
     * tv_2.testVerify_2();
     * @return Returns true if the signature is successfully verified.
     */
    global static Boolean verify(String algorithmName, Blob data, Blob signature, String certDevName) { return false; }

    /**
     * Verifies the digital signature for the data blob using the specified algorithm and the supplied public key. Use this method to verify a blob signed by a digital signature created using a third-party application or the sign method.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. To run it correctly, you must:
     * generate an X.509 private key and public certificate
     * convert the private key to PKCS8
     * extract the public key from the public certificate
     * You provide the private PKCS8 key to the sign method, and the extracted public key to the verify method (along with the signature you generate with sign.
     * At your terminal, use openssl to create the X.509 key pair:
     * $ openssl req -x509 -newkey rsa:2048 -keyout myPriv509.key -out myPub509.cert -days 365
     *
     * Convert the private key to PKCS8:
     * openssl pkey -in myPriv509.key -out myPriv509pkcs8.pem
     * Extract the public key from myPub509.cert:
     * openssl x509 -in myPub509.cert -inform pem -pubkey -out myPub509.pem
     * After you create the myPub509.pem key, you decode just the key portions of the text (without the BEGIN PRIVATE KEY or END PRIVATE KEY lines) for both the privateKey and publicKey parameters.
     *     public class TestVerify {
     *         public void testVerify() {
     *
     *             String algorithmName = 'RSA';
     *             Blob input = Blob.valueOf('Here is some text.');
     *
     *             //contents of myPriv509pkcs8.pem
     *             String myPriv509pkcs8 = 'contents of myPriv509pkcs8.pem';
     *
     *             Blob privateKey = EncodingUtil.base64Decode(myPriv509pkcs8);
     *
     *             Blob signature = Crypto.sign(algorithmName, input, privateKey);
     *
     *             //contents of myPub509.pem
     *             String publicKeyTxt64 = 'contents of myPub509.pem';
     *
     *             Blob publicKey = EncodingUtil.base64Decode(publicKeyTxt64);
     *
     *             Boolean verified = false;
     *             verified = Crypto.verify(algorithmName, input, signature, publicKey);
     *
     *             Assert.areEqual(true, verified);
     *
     *       }
     *   }
     *
     * To invoke, run the following:
     * TestVerify tv = new TestVerify();
     * tv.testVerify();
     * @return true if and only if the signature is successfully verified.
     */
    global static Boolean verify(String algorithmName, Blob data, Blob signature, Blob publicKey) { return false; }

    /**
     * Verifies the HMAC signature for the data blob using the specified algorithm, input data, private key, and the mac. Use this method to verify a blob signed by a digital signature created using a third-party application or the sign method.
     * Example
     * You can use your preferred <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_intro_writing_apex.htm" target="_blank" title="HTML (New Window)">Salesforce development environment</a> to test this function. Create the following Apex class:
     *     public class TestVerifyMAC {
     *
     *         public void testVerifyMAC() {
     *             String salt = String.valueOf(Crypto.getRandomInteger());
     *             String key = 'key';
     *             Blob data = crypto.generateMac('HmacSHA256',
     *                 Blob.valueOf(salt),
     *                 Blob.valueOf(key));
     *             System.debug('Generated MAC: ');
     *             System.debug(EncodingUtil.base64Encode(data));
     *
     *             Boolean verified = false;
     *
     *             verified = Crypto.verifyHMac('HmacSHA256', Blob.valueOf(salt), Blob.valueOf(key), data);
     *             Assert.areEqual(true, verified);
     *         }
     *     }
     *
     * To invoke this method, run the following:
     * TestVerifyMAC tvm = new TestVerifyMAC();
     * tvm.testVerifyMAC();
     * @return The verification status of the data to verify.
     */
    global static Boolean verifyHmac(String algorithmName, Blob data, Blob privateKey, Blob hmacToVerify) { return false; }
}