defmodule TaxiBeWeb.TaxiAllocationJob do
  use GenServer

  def start_link(request, name) do
    GenServer.start_link(__MODULE__, request, name: name)
  end

  def init(request) do
    Process.send(self(), :step1, [:nosuspend])
    {:ok, %{
      request: request,
      accepted: false,
      start_time: :os.system_time(:second),
      candidates: [],
      timer: nil
    }}
  end

  def compute_ride_fare(request) do
    {request, [70, 90, 120, 200, 250] |> Enum.random()}
  end

  def notify_customer_ride_fare({request, fare}) do
    %{"username" => customer} = request
    msg = %{msg: "Ride fare: #{fare}"}

    IO.inspect(msg, label: "Enviando tarifa al customer:#{customer}")
    TaxiBeWeb.Endpoint.broadcast("customer:" <> customer, "booking_request", msg)
  end

  def find_candidate_taxis(%{"pickup_address" => _}) do
    [
      %{nickname: "frodo", latitude: 19.0319783, longitude: -98.2349368},
      %{nickname: "pippin", latitude: 19.0061167, longitude: -98.2697737},
      %{nickname: "samwise", latitude: 19.0092933, longitude: -98.2473716}
    ]
  end

  def handle_info(:step1, %{request: request} = state) do
    compute_ride_fare(request)
    |> notify_customer_ride_fare()

    list_of_taxis = find_candidate_taxis(request)

    Enum.each(list_of_taxis, fn taxi ->
      msg = %{
        msg: "Viaje de '#{request["pickup_address"]}' a '#{request["dropoff_address"]}'",
        bookingId: request["booking_id"]
      }

      IO.inspect(msg, label: "Enviando solicitud a driver:#{taxi.nickname}")

      TaxiBeWeb.Endpoint.broadcast(
        "driver:" <> taxi.nickname,
        "booking_request",
        msg
      )
    end)

    timer = Process.send_after(self(), :timeout_3_drivers, 90_000)

    {:noreply, Map.merge(state, %{
      candidates: list_of_taxis,
      accepted: false,
      timer: timer
    })}
  end

  def handle_info(:timeout_3_drivers, %{accepted: false, request: %{"username" => username}} = state) do
    msg = %{msg: "No fue posible asignar un taxi en este momento"}

    IO.puts(" Tiempo agotado. No fue posible asignar un taxi para #{username}")
    TaxiBeWeb.Endpoint.broadcast("customer:" <> username, "booking_request", msg)

    {:stop, :normal, state}
  end

  def handle_info(:timeout_3_drivers, state), do: {:noreply, state}

  def handle_cast({:process_accept, _msg}, %{accepted: false, request: %{"username" => customer, "booking_id" => booking_id}} = state) do
    msg = %{
      msg: "Tu taxi está en camino y llegará en 5 minutos",
      bookingId: booking_id
    }

    IO.inspect(msg, label: "Taxi aceptado para customer:#{customer}")
    TaxiBeWeb.Endpoint.broadcast("customer:" <> customer, "booking_request", msg)

    Process.cancel_timer(state.timer)

    {:noreply, %{state | accepted: true}}
  end

  def handle_cast({:process_reject, _msg}, state) do
    IO.puts(" Rechazo recibido. Esperando más respuestas...")
    {:noreply, state}
  end

  def handle_call({:cancel_request, username}, _from, state) do
    now = :os.system_time(:second)
    elapsed = now - state.start_time

    msg =
      cond do
        !state.accepted ->
          "Cancelación sin cargo"

        elapsed >= 0 and elapsed <= 180 ->
          "Cancelación con cargo de $20"

        elapsed > 180 and elapsed < 300 ->
          "Cancelación sin cargo"

        true ->
          "Cancelación fuera de rango"
      end

    IO.puts(" Cancelación solicitada por #{username}: #{msg}")
    TaxiBeWeb.Endpoint.broadcast("customer:" <> username, "booking_request", %{msg: msg})

    {:stop, :normal, state, :ok}
  end
end
