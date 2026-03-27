 <!-- Modal that pops up when the parent opts to send the message to the database.
         Parent can enter name for message, message/description for nurse and option to input a date/time to be played -->
         <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="exampleModalLabel">New Recording</h1>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form class="was-validated">
                        <div class="mb-3">
                            <label for="recipient-name" class="col-form-label">Recording Name:</label>
                            <input type="text" class="form-control" id="recording-name" oninvalid="alert('Missing Name')" required>
                            <div class="valid-feedback">Valid.</div>
                            <div class="invalid-feedback">Please fill out this field.</div>
                        </div>
                        <div class="mb-3">
                            <label for="message-text" class="col-form-label">Message:</label>
                            <textarea class="form-control" id="recording-message" required></textarea>
                            <div class="valid-feedback">Valid.</div>
                            <div class="invalid-feedback">Please fill out this field.</div>
                        </div>
                        <div class="form-group">
                            <label for="datetime-input">(OPTIONAL) Select a date and time:</label>
                            <input type="datetime-local" class="form-control" id="datetime-input" name="datetime">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="submit" id = "sendinfo" class="btn btn-primary">Send message</button>
                        </div>
                    </form>
                </div>
                
            </div>
        </div>
    </div>