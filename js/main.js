'use strict';
var ball_num = 0;
var balls = []
var fps = 60;

var canvas;
var ctx;
var balls_data;
var videoContainer; // object to hold video and associated info
var bar_height = 0;
var bar_height_spd = 0;
var device_is_mobile = false;
var link_image;
var play_image;
var paid_image;

var wobble_t = 0;
var wobble_ball_index = 0;
var do_wobbles = true;

//-- document load event
$(document).ready(function()
{
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    // detect mobile device
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        device_is_mobile = true;
    }

    //$("#title").hide();

    //-- link image
    link_image = new Image(212, 212);
    link_image.src = "images/link_nice.png";
    //-- play image
    play_image = new Image(183, 183);
    play_image.src = "images/play.png";
    //-- paid image
    paid_image = new Image(180, 180);
    paid_image.src = "images/paid.png";

    // set window size
    resize();
    $( window ).resize(function(){resize();});
    window.addEventListener('orientationchange', resize);

    // set bar height
    var text_scale = 0.03;
    var size = text_scale * canvas.width;
    var aspect = canvas.width / canvas.height;
    if (size < 60)
        size = 60;
    bar_height = 3 * size;
    // load JSON file
    $.getJSON("balls.json", function(json) {
        //console.log(json); // this will show the info it in firebug console
        balls_data = json;
        for (var i = 0; i < json.length; i++)
        {
            var xx = json[i].x;
            var yy = (json[i].y) * 0.8 + 0.2;
            if (canvas.width > canvas.height)
            {
                xx = balls_data[i].y;// / aspect + (aspect - 1) / 4;
                yy = (balls_data[i].x) * 0.95 + 0.05;
            }
            var b = create_ball(json, i, 0, xx, yy, true);
            b.radius = json[i].radius * 0.66;
        }
        setInterval(function(){loop();}, 1000 / fps);
    });

    // back button pressed
    window.onpopstate = function(event) {
        console.log("> new_page: " + new_page)
        console.log("> event.state: " + event.state)
        location.reload();
    };
    var btn = $("#mc-embedded-subscribe");
    btn.disabled = true;
    btn.css('background-color', '#AAAAAA');
    btn.css('cursor', 'default');
    $("#mce-EMAIL").on('input', function(e){
        var str = $(this).val();
        var pattern = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
        if (str.match(pattern))
        {
            btn.disabled = false;
            btn.css('background-color', '#FEAF00');
            btn.css('cursor', 'pointer');
        }
        else
        {
            btn.disabled = true;
            btn.css('background-color', '#AAAAAA');
            btn.css('cursor', 'default');
        }
    });
});

//-- initializing ball instance
function create_ball(ball_list, index, layer, x, y, offset_xy)
{
    var b = ball_list[index];
    var xx = x;
    var yy = y;
    if (xx == -1)
        xx = b.x;
    if (yy == -1)
        yy = b.y;
    if (offset_xy)
    {
        xx += 0.5 * canvas.width / scale - 0.5;
        yy += 0.5 * canvas.height / scale - 0.5;
    }
    var ball = new Ball(b.name, b.title, index, layer, b.image, b.video, b.video_loop, b.video_autoplay, b.color, b.bar_color, b.radius, b.enhance_factor, b.clip, b.textscale, xx, yy, b.children, b.pops, b.show_name, b.url, b.text_color, b.text, b.paid);
    balls.push(ball);
    return ball;
}

//-- resizing
var scale = 1;
function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    scale = canvas.width;
    if (canvas.height < canvas.width)
        scale = canvas.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//-- main loop
var collision_counter;
var cursor = "default";
var cursor_prev = cursor;
var selection = -1;
var linked = false;
function loop()
{
    //-- tapped
    if (tapped_timer > 0)
        tapped_timer--;
    
    //-- set cursor style
    if (cursor != cursor_prev)
        $('canvas').css('cursor', cursor);
    cursor_prev = cursor;
    cursor = "default";

    //-- step
    var text_scale = 0.03;
    var size = text_scale * canvas.width;
    if (size < 60)
        size = 60;

    collision_counter = ball_num;
    for (var i = 0; i<ball_num; i++)
    {
        balls[i].ball_index = i;
        balls[i].step();
    }

    draw_site_url(canvas.height * 0.065);
    // back button
    if (mouse.x < canvas.height * 0.15 / scale && mouse.y < canvas.height * 0.08/ scale)
        cursor = 'pointer';

    //-- wobble parent balls
    if (!do_wobbles)
    {
        wobble_t = 0;
        wobble_ball_index = 0;
    }
    do_wobbles = true;
    wobble_t += 0.05;
    if (wobble_t >= 1 && ball_num > 0)
    {
        wobble_t-=0.5;

        // select next ball with children
        var start_i = wobble_ball_index;
        while(wobble_ball_index == start_i || !balls[wobble_ball_index].pops)
        {
            wobble_ball_index++;
            if (wobble_ball_index >= ball_num)
            {
                wobble_ball_index = -1;
                wobble_t-=4;
                break;
            }
        }
        var ball = balls[wobble_ball_index];
        // wobble ball (if any)
        if (wobble_t > 0)
        {
            ball.wobble = 3;
            ball.wobblerot = 90;
        }
    }

    //-- draw balls
    for (var i = 0; i<ball_num; i++)
        balls[i].draw();
}

var current_background_color;
var current_bar_color = "#1a1c2c";
var url_t = 0;
var subtitle_string = "Indie Game Dev";
var vgc_t = -10;
function draw_site_url(size)
{
    // clear bars
    bar_height_spd *= 0.85;
    bar_height += bar_height_spd;
    ctx.clearRect(0, 0, canvas.width, size * 3.5);
    ctx.clearRect(0, canvas.height - size * 2.2, canvas.width, canvas.height);

    // draw url bar
    ctx.fillStyle = current_bar_color;//"#DBD28E";
        ctx.clearRect(0, 0, canvas.width, size * 5);
    //if (current_layer == 0)
    //{
    //    bar_height = -size * 0.2;
    //    bar_height_spd += (-size * 0.2 - bar_height) * 0.05;
    //}
    //else
    if (current_layer > 0 || linked)
    {
        bar_height_spd += (size * 1.5 - bar_height) * 0.05;
        vgc_t = -10;
    }
    else
    //if (current_layer == 1)
    {
        bar_height_spd += (size * 3.3 - bar_height) * 0.2;
        bar_height_spd *= 0.5;
        current_bar_color = "#1a1c2c";

        if (vgc_t <= subtitle_string.length)
        {
            vgc_t += 0.5;
            $("#vgc").html(subtitle_string.substr(0, vgc_t));
        }
    }
    ctx.fillRect(0, 0, canvas.width, bar_height);
    ctx.fillStyle = "#FFD88C";
    ctx.fillRect(0, canvas.height, canvas.width, canvas.height);

    //-- draw url thing
    ctx.globalAlpha = 0.5;
    ctx.font = size + "px Honyaji";
    ctx.textAlign = "left";
    ctx.textBaseline="middle"; 

    // set text color
    ctx.fillStyle = "#000000";
    if (true || current_background_color == "#000000")
    {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#FFFFFF";
    }
    var str = new_page.replace('_', ' ');
    str = str.replace("-", "/");
    str = str.replace("-", "/");
    //str = str.replace("entersokzone/", '');
    var arrow = String.fromCharCode(0x2190);
    if (current_layer>0)
        str = " " + arrow + " */" + str;
    else
        str = "";//" */" + str;
    if (linked)
        str = "  see ya later"
    if (url_t < str.length)
        url_t += 0.5;
    if (url_t > str.length)
        url_t -= 0.5;
    ctx.fillText(str.substr(0, url_t), 0, bar_height / 2);// - this.radius * scale * 1.25);
    ctx.globalAlpha = 1;
}


//-- helper functions
var a, b;
function distance(x1, y1, x2, y2)
{
    a = (x1 - x2);
    b = (y1 - y2);

    return Math.sqrt( a*a + b*b );
}

// variables for ball_ball_collision
var dst = 0;
var xoff, yoff;
var diff = 0;
var m1, r1, r2;
function ball_ball_collision(a, b)
{
    dst = a.radius + b.radius;
        
    xoff = a.x - b.x;
    yoff = a.y - b.y;

    //-- optimization
    if (xoff > dst || -xoff > dst || yoff > dst || -yoff > dst)
        return;

    diff = xoff * xoff + yoff * yoff;
    if (diff < dst * dst)
    {
        diff = Math.sqrt(diff) - dst; 
        dst = 1 / dst;
        xoff *= diff * dst;
        yoff *= diff * dst;
        
        m1 = 1 / (b.mass+a.mass)
        r1=b.mass * m1;
        r2=a.mass * m1;
        a.hspd -= xoff * r1;
        a.vspd -= yoff * r1;
        a.rspd += diff * r1 * 0.5;
        b.hspd += xoff * r2;
        b.vspd += yoff * r2;
        b.rspd += diff * r2 * 0.5;
    }
}

function readyToPlayVideo(event)
{ 
    // the video may not match the canvas size so find a scale to fit
    videoContainer.scale = Math.min(
                         canvas.width / this.videoWidth, 
                         canvas.height / this.videoHeight); 
    videoContainer.ready = true;
    // the video can be played so hand it off to the display function
    requestAnimationFrame(updateCanvas);
}
