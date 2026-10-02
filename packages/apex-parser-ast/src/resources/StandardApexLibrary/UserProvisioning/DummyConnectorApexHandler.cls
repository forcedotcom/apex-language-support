global class DummyConnectorApexHandler extends UserProvisioning.UserProvisioningProcessHandler {
    global Object DummyConnectorApexHandler() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override UserProvisioning.ProvisioningProcessHandlerOutput invoke(UserProvisioning.ProvisioningProcessHandlerInput input) { return null; }

    global override virtual String toString() { return null; }
}