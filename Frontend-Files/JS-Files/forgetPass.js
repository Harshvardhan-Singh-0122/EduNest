 //----------Harsh
 
 const resetBtn = document.getElementById('submitBtn');
        resetBtn.addEventListener('click', ()=>{
            const email = document.getElementById('email').value;
            fetch('/api/forget-password', {
                method: 'POST',
                 headers:{
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })

            }).then(response => response.json())
            .then(data => {
                const successMessage = document.getElementById('successMessage');
                successMessage.style.display = 'block';
                if(!data.message){
                    successMessage.innerText = "This Email is not Found !!"
                }else{
                    successMessage.innerText = "Password reset email sent!!! Please check your inbox and follow the instructions."
                }
                console.log(data.message);
            })
            .catch(err=>{
                console.error("Error:", err);
                alert("Failed to send email. Please try again later.");
            })
        })

         document.getElementById('resetForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const loadingMessage = document.getElementById('loadingMessage');
            const successMessage = document.getElementById('successMessage');
            const emailError = document.getElementById('emailError');
            const email = document.getElementById('email').value;

            // Hide previous messages
            emailError.style.display = 'none';
            successMessage.style.display = 'none';

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                emailError.textContent = 'Please enter a valid email address';
                emailError.style.display = 'block';
                return;
            }

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.style.display = 'none';
            loadingMessage.style.display = 'block';

            // Simulate API call
            setTimeout(() => {
                // Hide loading
                loadingMessage.style.display = 'none';
                submitBtn.style.display = 'block';
                submitBtn.disabled = false;

                // Show success message
                successMessage.style.display = 'block';
                
                // Clear form
                document.getElementById('email').value = '';
                
                // Scroll to top to show success message
                document.querySelector('.reset-card').scrollIntoView({ behavior: 'smooth' });
            }, 4000);
        });

        // Real-time email validation
        document.getElementById('email').addEventListener('input', function() {
            const emailError = document.getElementById('emailError');
            const email = this.value;
            
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                emailError.textContent = 'Please enter a valid email address';
                emailError.style.display = 'block';
            } else {
                emailError.style.display = 'none';
            }
        });