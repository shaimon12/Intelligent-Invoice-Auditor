using Microsoft.AspNetCore.SignalR;

namespace InvoiceAuditor.API.Hubs
{
    public class InvoiceHub : Hub
    {
        // Clients (React) will listen for events, the server (.NET) will push them.
        // We don't need to define any custom methods here for our webhook pattern.
    }
}