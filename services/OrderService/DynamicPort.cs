using System.Net;
using System.Net.Sockets;

public static class DynamicPort
{
    private const int MaxScanRange = 50;

    // Keep listeners alive so ports remain reserved
    private static readonly List<TcpListener> ReservedListeners = new();

    private static readonly object LockObj = new();

    public static int Resolve(string serviceName, int basePort)
    {
        var envPort = Environment.GetEnvironmentVariable("PORT");

        if (!string.IsNullOrWhiteSpace(envPort) &&
            int.TryParse(envPort, out var explicitPort))
        {
            Console.WriteLine($"[DynamicPort] {serviceName}: using PORT env var → {explicitPort}");
            return explicitPort;
        }

        lock (LockObj)
        {
            for (int candidate = basePort;
                 candidate < basePort + MaxScanRange;
                 candidate++)
            {
                try
                {
                    var listener = new TcpListener(IPAddress.Loopback, candidate);

                    listener.Start();

                    // Reserve the port
                    ReservedListeners.Add(listener);

                    Console.WriteLine(
                        $"[DynamicPort] {serviceName}: allocated port {candidate}");

                    return candidate;
                }
                catch (SocketException)
                {
                    Console.WriteLine(
                        $"[DynamicPort] {serviceName}: port {candidate} busy, trying next...");
                }
            }
        }

        throw new InvalidOperationException(
            $"[DynamicPort] {serviceName}: no free port found.");
    }

    public static void ReleaseAll()
    {
        foreach (var listener in ReservedListeners)
        {
            try
            {
                listener.Stop();
            }
            catch
            {
            }
        }

        ReservedListeners.Clear();
    }
}