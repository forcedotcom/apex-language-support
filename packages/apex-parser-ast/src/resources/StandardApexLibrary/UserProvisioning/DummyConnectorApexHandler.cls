global class DummyConnectorApexHandler extends UserProvisioning.UserProvisioningProcessHandler {
    global DummyConnectorApexHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override UserProvisioning.ProvisioningProcessHandlerOutput invoke(UserProvisioning.ProvisioningProcessHandlerInput input) { return null; }

    global override virtual String toString() { return null; }
}