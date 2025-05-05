function extractTwoNumbers(input) {
    const value = input.value;
    const numbers = value.match(/-?\d+(\.\d+)?/g); // 문자열에서 숫자 추출
    if (numbers) {
        input.value = numbers.slice(0, 2).sort((a, b) => a - b).join(', '); // 처음 2개의 숫자를 정렬
    } else {
        input.value = ''; // 숫자가 없으면 빈 문자열로 설정
    }
}

var mapContainer = document.getElementById('map'), // 지도를 표시할 div
    mapOption = {
        center: new kakao.maps.LatLng(37.5132612, 127.1001336), // 지도의 중심좌표
        level: 4 // 지도의 확대 레벨
    };

var map = new kakao.maps.Map(mapContainer, mapOption); // 지도를 생성합니다
var geocoder = new kakao.maps.services.Geocoder(); // 주소-좌표 변환 객체를 생성합니다
var ps = new kakao.maps.services.Places(); // 장소 검색 객체를 생성합니다

var drawingFlag = false; // 선이 그려지고 있는 상태를 가지고 있을 변수입니다
var moveLine; // 선이 그려지고 있을때 마우스 움직임에 따라 그려질 선 객체 입니다
var clickLine // 마우스로 클릭한 좌표로 그려질 선 객체입니다
var distanceOverlay; // 선의 거리정보를 표시할 커스텀오버레이 입니다
var dots = []; // 선이 그려지고 있을때 클릭할 때마다 클릭 지점과 거리를 표시하는 커스텀 오버레이 배열입니다.

window.onload = function () {
    document.getElementById('show-distance').onclick();
};

document.getElementById('show-distance').onclick = function () {
    var coordinate1Value = document.getElementById('coordinate1').value;
    var [lat1, lng1] = coordinate1Value.split(', ').map(parseFloat);

    var coordinate2Value = document.getElementById('coordinate2').value;
    var [lat2, lng2] = coordinate2Value.split(', ').map(parseFloat);

    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        alert('좌표를 올바르게 입력하세요.');
        return;
    }

    var coordinate1 = new kakao.maps.LatLng(lat1, lng1);
    var coordinate2 = new kakao.maps.LatLng(lat2, lng2);

    deleteClickLine();
    deleteDistnce();
    deleteCircleDot();

    clickLine = new kakao.maps.Polyline({
        map: map, // 선을 표시할 지도입니다
        path: [coordinate1, coordinate2], // 선을 구성하는 좌표 배열입니다 클릭한 위치를 넣어줍니다
        strokeWeight: 3, // 선의 두께입니다
        strokeColor: '#db4040', // 선의 색깔입니다
        strokeOpacity: 1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
        strokeStyle: 'solid' // 선의 스타일입니다
    });

    var distance = Math.round(clickLine.getLength());
    // 클릭한 지점에 대한 정보를 지도에 표시합니다
    displayCircleDot(coordinate1, 0);
    displayCircleDot(coordinate2, distance);

    if (dots[dots.length - 1].distance) {
        dots[dots.length - 1].distance.setMap(null);
        dots[dots.length - 1].distance = null;
    }
    showDistance(getTimeHTML(distance), coordinate2);

    // 지도 재조정
    var bounds = new kakao.maps.LatLngBounds();
    bounds.extend(coordinate1);
    bounds.extend(coordinate2);
    map.setBounds(bounds);
};

document.getElementById('search-place').onclick = function () {
    var keyword = document.getElementById('keyword').value;

    if (!keyword) {
        alert('키워드를 입력하세요!');
        return;
    }

    // 주소-좌표 변환 객체를 통해 주소로 좌표를 검색합니다
    geocoder.addressSearch(keyword, function (result, status) {
        // 정상적으로 검색이 완료됐으면
        if (status === kakao.maps.services.Status.OK) {
            var coords = new kakao.maps.LatLng(result[0].y, result[0].x);

            // 결과값으로 받은 위치를 마커로 표시합니다
            var marker = new kakao.maps.Marker({
                map: map,
                position: coords
            });

            // 지도의 중심을 결과값으로 받은 위치로 이동시킵니다
            map.setCenter(coords);

            document.getElementById('search-success').classList.remove('hidden');
            document.getElementById('search-success').classList.add('block');
            document.getElementById('search-fail').classList.remove('block');
            document.getElementById('search-fail').classList.add('hidden');
            document.getElementById('search-success').textContent = `${keyword}: ${result[0].y}, ${result[0].x}`;
            navigator.clipboard.writeText(`${result[0].y}, ${result[0].x}`);
        } else {
            // 키워드 검색 완료 시 호출되는 콜백함수 입니다
            ps.keywordSearch(keyword, function (result, status, pagination) {
                if (status === kakao.maps.services.Status.OK) {
                    var coords = new kakao.maps.LatLng(result[0].y, result[0].x);

                    // 결과값으로 받은 위치를 마커로 표시합니다
                    var marker = new kakao.maps.Marker({
                        map: map,
                        position: coords
                    });

                    // 지도의 중심을 결과값으로 받은 위치로 이동시킵니다
                    map.setCenter(coords);

                    document.getElementById('search-success').classList.remove('hidden');
                    document.getElementById('search-success').classList.add('block');
                    document.getElementById('search-fail').classList.remove('block');
                    document.getElementById('search-fail').classList.add('hidden');
                    document.getElementById('search-success').textContent = `${keyword}: ${result[0].y}, ${result[0].x}`;
                    navigator.clipboard.writeText(`${result[0].y}, ${result[0].x}`);
                } else {
                    document.getElementById('search-fail').classList.remove('hidden');
                    document.getElementById('search-fail').classList.add('block');
                    document.getElementById('search-success').classList.remove('block');
                    document.getElementById('search-success').classList.add('hidden');
                }
            })
        }
    });
}

function displayMarker(place) {
    // 마커를 생성하고 지도에 표시합니다
    var marker = new kakao.maps.Marker({
        map: map,
        position: new kakao.maps.LatLng(place.y, place.x)
    });

    // 마커에 클릭이벤트를 등록합니다
    kakao.maps.event.addListener(marker, 'click', function() {
        // 마커를 클릭하면 장소명이 인포윈도우에 표출됩니다
        infowindow.setContent('<div style="padding:5px;font-size:12px;">' + place.place_name + '</div>');
        infowindow.open(map, marker);
    });
}

// 지도에 클릭 이벤트를 등록합니다
// 지도를 클릭하면 선 그리기가 시작됩니다 그려진 선이 있으면 지우고 다시 그립니다
kakao.maps.event.addListener(map, 'click', function (mouseEvent) {

    // 마우스로 클릭한 위치입니다
    var clickPosition = mouseEvent.latLng;

    // 지도 클릭이벤트가 발생했는데 선을 그리고있는 상태가 아니면
    if (!drawingFlag) {

        // 상태를 true로, 선이 그리고있는 상태로 변경합니다
        drawingFlag = true;

        // 지도 위에 선이 표시되고 있다면 지도에서 제거합니다
        deleteClickLine();

        // 지도 위에 커스텀오버레이가 표시되고 있다면 지도에서 제거합니다
        deleteDistnce();

        // 지도 위에 선을 그리기 위해 클릭한 지점과 해당 지점의 거리정보가 표시되고 있다면 지도에서 제거합니다
        deleteCircleDot();

        // 클릭한 위치를 기준으로 선을 생성하고 지도위에 표시합니다
        clickLine = new kakao.maps.Polyline({
            map: map, // 선을 표시할 지도입니다
            path: [clickPosition], // 선을 구성하는 좌표 배열입니다 클릭한 위치를 넣어줍니다
            strokeWeight: 3, // 선의 두께입니다
            strokeColor: '#db4040', // 선의 색깔입니다
            strokeOpacity: 1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
            strokeStyle: 'solid' // 선의 스타일입니다
        });

        // 선이 그려지고 있을 때 마우스 움직임에 따라 선이 그려질 위치를 표시할 선을 생성합니다
        moveLine = new kakao.maps.Polyline({
            strokeWeight: 3, // 선의 두께입니다
            strokeColor: '#db4040', // 선의 색깔입니다
            strokeOpacity: 0.5, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
            strokeStyle: 'solid' // 선의 스타일입니다
        });

        // 클릭한 지점에 대한 정보를 지도에 표시합니다
        displayCircleDot(clickPosition, 0);


    } else { // 선이 그려지고 있는 상태이면

        // 그려지고 있는 선의 좌표 배열을 얻어옵니다
        var path = clickLine.getPath();

        // 좌표 배열에 클릭한 위치를 추가합니다
        path.push(clickPosition);

        // 다시 선에 좌표 배열을 설정하여 클릭 위치까지 선을 그리도록 설정합니다
        clickLine.setPath(path);

        var distance = Math.round(clickLine.getLength());
        displayCircleDot(clickPosition, distance);
    }
});

// 지도에 마우스무브 이벤트를 등록합니다
// 선을 그리고있는 상태에서 마우스무브 이벤트가 발생하면 그려질 선의 위치를 동적으로 보여주도록 합니다
kakao.maps.event.addListener(map, 'mousemove', function (mouseEvent) {

    // 지도 마우스무브 이벤트가 발생했는데 선을 그리고있는 상태이면
    if (drawingFlag) {

        // 마우스 커서의 현재 위치를 얻어옵니다
        var mousePosition = mouseEvent.latLng;

        // 마우스 클릭으로 그려진 선의 좌표 배열을 얻어옵니다
        var path = clickLine.getPath();

        // 마우스 클릭으로 그려진 마지막 좌표와 마우스 커서 위치의 좌표로 선을 표시합니다
        var movepath = [path[path.length - 1], mousePosition];

        moveLine.setPath(movepath);
        moveLine.setMap(map);

        var distance = Math.round(clickLine.getLength() + moveLine.getLength()), // 선의 총 거리를 계산합니다
            content = '<div class="dotOverlay distanceInfo">총거리 <span class="number">' + (distance / 1000).toFixed(3) + '</span>km</div>'; // 커스텀오버레이에 추가될 내용입니다

        // 거리정보를 지도에 표시합니다
        showDistance(content, mousePosition);
    }
});

// 지도에 마우스 오른쪽 클릭 이벤트를 등록합니다
// 선을 그리고있는 상태에서 마우스 오른쪽 클릭 이벤트가 발생하면 선 그리기를 종료합니다
kakao.maps.event.addListener(map, 'rightclick', function (mouseEvent) {

    // 지도 오른쪽 클릭 이벤트가 발생했는데 선을 그리고있는 상태이면
    if (drawingFlag) {

        // 마우스무브로 그려진 선은 지도에서 제거합니다
        moveLine.setMap(null);
        moveLine = null;

        // 마우스 클릭으로 그린 선의 좌표 배열을 얻어옵니다
        var path = clickLine.getPath();

        // 선을 구성하는 좌표의 개수가 2개 이상이면
        if (path.length > 1) {

            // 마지막 클릭 지점에 대한 거리 정보 커스텀 오버레이를 지웁니다
            if (dots[dots.length - 1].distance) {
                dots[dots.length - 1].distance.setMap(null);
                dots[dots.length - 1].distance = null;
            }

            var distance = Math.round(clickLine.getLength()), // 선의 총 거리를 계산합니다
                content = getTimeHTML(distance); // 커스텀오버레이에 추가될 내용입니다

            // 그려진 선의 거리정보를 지도에 표시합니다
            showDistance(content, path[path.length - 1]);

        } else {

            // 선을 구성하는 좌표의 개수가 1개 이하이면
            // 지도에 표시되고 있는 선과 정보들을 지도에서 제거합니다.
            deleteClickLine();
            deleteCircleDot();
            deleteDistnce();

        }

        // 상태를 false로, 그리지 않고 있는 상태로 변경합니다
        drawingFlag = false;
    }
});

// 클릭으로 그려진 선을 지도에서 제거하는 함수입니다
function deleteClickLine() {
    if (clickLine) {
        clickLine.setMap(null);
        clickLine = null;
    }
}

// 마우스 드래그로 그려지고 있는 선의 총거리 정보를 표시하거
// 마우스 오른쪽 클릭으로 선 그리가 종료됐을 때 선의 정보를 표시하는 커스텀 오버레이를 생성하고 지도에 표시하는 함수입니다
function showDistance(content, position) {
    if (distanceOverlay) { // 커스텀오버레이가 생성된 상태이면

        // 커스텀 오버레이의 위치와 표시할 내용을 설정합니다
        distanceOverlay.setPosition(position);
        distanceOverlay.setContent(content);

    } else { // 커스텀 오버레이가 생성되지 않은 상태이면

        // 커스텀 오버레이를 생성하고 지도에 표시합니다
        distanceOverlay = new kakao.maps.CustomOverlay({
            map: map, // 커스텀오버레이를 표시할 지도입니다
            content: content,  // 커스텀오버레이에 표시할 내용입니다
            position: position, // 커스텀오버레이를 표시할 위치입니다.
            xAnchor: 0,
            yAnchor: 0,
            zIndex: 3
        });
    }
}

// 그려지고 있는 선의 총거리 정보와
// 선 그리가 종료됐을 때 선의 정보를 표시하는 커스텀 오버레이를 삭제하는 함수입니다
function deleteDistnce() {
    if (distanceOverlay) {
        distanceOverlay.setMap(null);
        distanceOverlay = null;
    }
}

// 선이 그려지고 있는 상태일 때 지도를 클릭하면 호출하여
// 클릭 지점에 대한 정보 (동그라미와 클릭 지점까지의 총거리)를 표출하는 함수입니다
function displayCircleDot(position, distance) {

    // 클릭 지점을 표시할 빨간 동그라미 커스텀오버레이를 생성합니다
    var circleOverlay = new kakao.maps.CustomOverlay({
        content: '<span class="dot"></span>',
        position: position,
        zIndex: 1
    });

    // 지도에 표시합니다
    circleOverlay.setMap(map);

    // 좌표 표기
    var coordinateOverlay = new kakao.maps.CustomOverlay({
        content: `<div class="dotOverlay"><span> ${position.getLat()}, ${position.getLng()} </span></div>`,
        position: position,
        yAnchor: 1,
        zIndex: 3
    });

    // 지도에 표시합니다
    coordinateOverlay.setMap(map);

    if (distance > 0) {
        // 클릭한 지점까지의 그려진 선의 총 거리를 표시할 커스텀 오버레이를 생성합니다
        var distanceOverlay = new kakao.maps.CustomOverlay({
            content: '<div class="dotOverlay">거리 <span class="number">' + (distance / 1000).toFixed(3) + '</span>km</div>',
            position: position,
            yAnchor: 2.18,
            zIndex: 4
        });

        // 지도에 표시합니다
        distanceOverlay.setMap(map);
    }

    // 배열에 추가합니다
    dots.push({circle: circleOverlay, distance: distanceOverlay, coordinate: coordinateOverlay});
}

// 클릭 지점에 대한 정보 (동그라미와 클릭 지점까지의 총거리)를 지도에서 모두 제거하는 함수입니다
function deleteCircleDot() {
    var i;

    for (i = 0; i < dots.length; i++) {
        if (dots[i].circle) {
            dots[i].circle.setMap(null);
        }

        if (dots[i].distance) {
            dots[i].distance.setMap(null);
        }

        if (dots[i].coordinate) {
            dots[i].coordinate.setMap(null);
        }
    }

    dots = [];
}

// 마우스 우클릭 하여 선 그리기가 종료됐을 때 호출하여
// 그려진 선의 총거리 정보와 거리에 대한 도보, 자전거 시간을 계산하여
// HTML Content를 만들어 리턴하는 함수입니다
function getTimeHTML(distance) {
    // 거리와 도보 시간, 자전거 시간을 가지고 HTML Content를 만들어 리턴합니다
    var content = '<ul class="dotOverlay distanceInfo">';
    content += '    <li>';
    content += '        <span class="label">총거리</span><span class="number">' + (distance / 1000).toFixed(3) + '</span>km';
    content += '    </li>';
    content += '</ul>'

    return content;
}
