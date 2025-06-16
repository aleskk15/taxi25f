import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import socket from '../services/taxi_socket';
import { TextField, Card, CardContent, Typography } from '@mui/material';

function Customer(props) {
  let [pickupAddress, setPickupAddress] = useState("Tecnologico de Monterrey, campus Puebla, Mexico");
  let [dropOffAddress, setDropOffAddress] = useState("Triangulo Las Animas, Puebla, Mexico");
  let [msg, setMsg] = useState("");
  let [msg1, setMsg1] = useState("");
  let [bookingId, setBookingId] = useState();
  let [visible, setVisible] = useState(false);

  useEffect(() => {
    const channel = socket.channel("customer:" + props.username, {token: "123"});
    
    channel.on("greetings", data => console.log(data));

    channel.on("booking_request", data => {
      console.log("CUSTOMER RECEIVED:", data);
      setMsg1(data.msg);
      if (data.bookingId) {
        setBookingId(data.bookingId);
      }
      setVisible(true);
    });

    channel.join();

    return () => {
      channel.leave();
    };
  }, [props.username]);

  const submit = () => {
    fetch(`http://localhost:4000/api/bookings`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        pickup_address: pickupAddress,
        dropoff_address: dropOffAddress,
        username: props.username
      })
    }).then(resp => resp.json()).then(data => {
      setMsg(data.msg);
    });
  };

  const cancelBooking = () => {
    if (!bookingId) return;
    fetch(`http://localhost:4000/api/bookings/${bookingId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'cancel', username: props.username })
    }).then(() => {
      setMsg1("Cancelación enviada.");
      setVisible(false);
    });
  };

  return (
    <div style={{textAlign: "center", borderStyle: "solid"}}>
      Customer: {props.username}
      <div style={{padding: "10px"}}>
        <TextField label="Pickup address" fullWidth onChange={ev => setPickupAddress(ev.target.value)} value={pickupAddress}/>
        <TextField label="Drop off address" fullWidth onChange={ev => setDropOffAddress(ev.target.value)} value={dropOffAddress}/>
        <Button onClick={submit} variant="outlined" color="primary">submit</Button>
      </div>

      <div style={{backgroundColor: "lightcyan", height: "50px", padding: "10px"}}>
        {msg}
      </div>

      {visible && (
        <Card variant="outlined" style={{margin: "auto", width: "600px", marginTop: "20px"}}>
          <CardContent>
            <Typography>{msg1}</Typography>
            {bookingId && (
              <Button onClick={cancelBooking} variant="outlined" color="error">
                Cancelar viaje
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Customer;
